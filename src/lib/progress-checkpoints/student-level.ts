/**
 * Progress checkpoints — per-student levels (DB layer).
 *
 * Builds the view the student card, the teacher table and the parent summary all
 * render. One code path so those three surfaces can never disagree.
 *
 * A CLOSED checkpoint reports its locked snapshot; an OPEN one is computed live.
 * When a student has since passed a higher target than their locked level, that is
 * surfaced separately as `caughtUpLevel` rather than silently changing the locked
 * number.
 */

import { prisma } from '@/lib/db'
import {
  computeCheckpointLevel,
  missionsRemainingToTarget,
  clearedBenchmarkIdsAsOf,
  endOfSchoolDayUtc,
  isCheckpointClosed,
  type ClearableRow,
  type LevelTarget,
} from './levels'
import { resolvePlanIdForClass } from './config'
import { lockCheckpointsForStudents, type LockedLevel } from './snapshot'

export interface CheckpointLevelView {
  checkpointId: string
  checkpointNumber: number
  endsOn: Date
  isClosed: boolean
  /** The reported level: locked snapshot when closed, live when open. */
  level: number
  /** Highest level this checkpoint can award (may be < 4 if partly configured). */
  maxLevel: number
  nextLevel: number | null
  /** Missions still to finish to reach `nextLevel`; null when there is no next. */
  missionsToNextLevel: number | null
  /** Reachable missions cleared (as of the checkpoint's cutoff when closed). */
  missionsCleared: number
  /** Missions cleared beyond the top target — "3 past the checkpoint". */
  missionsPastTopTarget: number
  /**
   * Live level now, when it EXCEEDS a closed checkpoint's locked level. Null when
   * the checkpoint is open or the student has not since improved. Teacher- and
   * parent-facing only; the locked number is what stands.
   */
  caughtUpLevel: number | null
}

/** Everything needed to compute views, loaded once per request. */
export interface CheckpointContext {
  planId: string
  checkpoints: {
    id: string
    checkpointNumber: number
    endsOn: Date
    targets: LevelTarget[]
  }[]
  /** Reachable missions in map order. */
  orderedSequenceOrders: number[]
  sequenceOrderByBenchmarkId: Map<string, number>
}

/**
 * Load the checkpoint configuration a class follows, plus the reachable-mission
 * ordering the "N missions to go" figures are counted against.
 */
export async function loadCheckpointContext(classId: string): Promise<CheckpointContext | null> {
  const planId = await resolvePlanIdForClass(classId)
  if (!planId) return null

  const [checkpoints, reachable] = await Promise.all([
    prisma.progressCheckpoint.findMany({
      where: { planId },
      orderBy: { checkpointNumber: 'asc' },
      select: {
        id: true,
        checkpointNumber: true,
        endsOn: true,
        targets: {
          orderBy: { level: 'asc' },
          select: {
            level: true,
            benchmarkId: true,
            benchmark: { select: { sequenceOrder: true } },
          },
        },
      },
    }),
    // The completable chain — same definition the unlock engine uses.
    prisma.benchmark.findMany({
      where: {
        code: { startsWith: 'SS.7.CG.' },
        unit: { active: true },
        assessments: {
          some: { assessmentType: 'MASTERY_CHALLENGE', approvalStatus: 'APPROVED' },
        },
      },
      orderBy: { sequenceOrder: 'asc' },
      select: { id: true, sequenceOrder: true },
    }),
  ])

  return {
    planId,
    checkpoints: checkpoints.map((cp) => ({
      id: cp.id,
      checkpointNumber: cp.checkpointNumber,
      endsOn: cp.endsOn,
      targets: cp.targets.map((t) => ({
        level: t.level,
        benchmarkId: t.benchmarkId,
        sequenceOrder: t.benchmark.sequenceOrder,
      })),
    })),
    orderedSequenceOrders: reachable.map((b) => b.sequenceOrder),
    sequenceOrderByBenchmarkId: new Map(reachable.map((b) => [b.id, b.sequenceOrder])),
  }
}

/**
 * Build one student's checkpoint views.
 *
 * `lockedByCheckpointId` supplies already-locked snapshots; pass an empty map to
 * compute everything live (used before locking, and by tests).
 */
export function buildCheckpointViews(
  ctx: CheckpointContext,
  progressRows: ClearableRow[],
  lockedByCheckpointId: Map<string, LockedLevel>,
  now: Date
): CheckpointLevelView[] {
  const liveCleared = clearedBenchmarkIdsAsOf(progressRows, null)

  return ctx.checkpoints.map((cp) => {
    const closed = isCheckpointClosed(cp.endsOn, now)
    const cutoff = endOfSchoolDayUtc(cp.endsOn)
    const clearedAtCutoff = closed
      ? clearedBenchmarkIdsAsOf(progressRows, cutoff)
      : liveCleared

    const atCutoff = computeCheckpointLevel(cp.targets, clearedAtCutoff)
    const liveOutcome = computeCheckpointLevel(cp.targets, liveCleared)

    const locked = lockedByCheckpointId.get(cp.id)
    const reportedLevel = closed ? (locked?.level ?? atCutoff.level) : atCutoff.level

    const clearedSequenceOrders = new Set(
      [...clearedAtCutoff]
        .map((id) => ctx.sequenceOrderByBenchmarkId.get(id))
        .filter((s): s is number => typeof s === 'number')
    )

    const missionsCleared = locked?.missionsCleared ?? clearedSequenceOrders.size

    const missionsToNextLevel =
      atCutoff.nextTarget === null
        ? null
        : missionsRemainingToTarget(
            ctx.orderedSequenceOrders,
            clearedSequenceOrders,
            atCutoff.nextTarget.sequenceOrder
          )

    const topTargetSequenceOrder =
      cp.targets.length > 0 ? Math.max(...cp.targets.map((t) => t.sequenceOrder)) : null
    const missionsPastTopTarget =
      topTargetSequenceOrder === null
        ? 0
        : [...clearedSequenceOrders].filter((s) => s > topTargetSequenceOrder).length

    return {
      checkpointId: cp.id,
      checkpointNumber: cp.checkpointNumber,
      endsOn: cp.endsOn,
      isClosed: closed,
      level: reportedLevel,
      maxLevel: atCutoff.maxLevel,
      nextLevel: atCutoff.nextLevel,
      missionsToNextLevel,
      missionsCleared,
      missionsPastTopTarget,
      caughtUpLevel:
        closed && liveOutcome.level > reportedLevel ? liveOutcome.level : null,
    }
  })
}

/** The class a student's checkpoints come from: first ACTIVE enrollment. */
export async function resolveStudentClassId(studentId: string): Promise<string | null> {
  const enrollment = await prisma.classEnrollment.findFirst({
    where: { studentId, status: 'ACTIVE', class: { active: true } },
    orderBy: { enrolledAt: 'asc' },
    select: { classId: true },
  })
  return enrollment?.classId ?? null
}

export interface CheckpointMarker {
  checkpointNumber: number
  level: number
}

/**
 * Which missions carry a checkpoint flag on the student's map, keyed by
 * Benchmark.id. Display only — the map never uses this to decide access.
 *
 * When several levels point at the same mission (possible across different
 * checkpoints), the earliest checkpoint/level wins so the flag shown is the first
 * one the student is working toward.
 */
export async function getCheckpointMarkersForStudent(
  studentId: string
): Promise<Map<string, CheckpointMarker>> {
  const classId = await resolveStudentClassId(studentId)
  if (!classId) return new Map()

  const ctx = await loadCheckpointContext(classId)
  if (!ctx) return new Map()

  const markers = new Map<string, CheckpointMarker>()
  for (const cp of ctx.checkpoints) {
    for (const t of cp.targets) {
      const existing = markers.get(t.benchmarkId)
      if (
        !existing ||
        cp.checkpointNumber < existing.checkpointNumber ||
        (cp.checkpointNumber === existing.checkpointNumber && t.level < existing.level)
      ) {
        markers.set(t.benchmarkId, { checkpointNumber: cp.checkpointNumber, level: t.level })
      }
    }
  }
  return markers
}

export interface StudentCheckpointsResult {
  checkpoints: CheckpointLevelView[]
  /** The checkpoint currently in play — the first not-yet-closed one. */
  current: CheckpointLevelView | null
}

/**
 * All checkpoint views for one student, locking any closed checkpoint that has
 * not been snapshotted yet (student-scoped — a student read never writes rows for
 * their classmates).
 */
export async function getStudentCheckpoints(
  studentId: string,
  now: Date = new Date()
): Promise<StudentCheckpointsResult> {
  const classId = await resolveStudentClassId(studentId)
  if (!classId) return { checkpoints: [], current: null }

  const ctx = await loadCheckpointContext(classId)
  if (!ctx || ctx.checkpoints.length === 0) return { checkpoints: [], current: null }

  const progressRows = await prisma.studentProgress.findMany({
    where: { studentId },
    select: {
      benchmarkId: true,
      status: true,
      masteredAt: true,
      offRampTriggeredAt: true,
    },
  })

  // Student-scoped locking: only this student's rows are ever written from here.
  const locked = await lockCheckpointsForStudents(
    ctx.checkpoints,
    ctx.sequenceOrderByBenchmarkId,
    [studentId],
    new Map([[studentId, progressRows]]),
    now
  )
  const lockedByCheckpointId = locked.get(studentId) ?? new Map<string, LockedLevel>()

  const checkpoints = buildCheckpointViews(ctx, progressRows, lockedByCheckpointId, now)
  const current = checkpoints.find((c) => !c.isClosed) ?? null

  return { checkpoints, current }
}
