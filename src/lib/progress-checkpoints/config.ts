/**
 * Progress checkpoints — teacher configuration (DB layer).
 *
 * Reads and writes the four nine-week checkpoints and their level targets.
 *
 * Authorization lives HERE, not only in the route: `assertClassOwnedByTeacher`
 * runs inside every exported function, so any future caller is protected too.
 * (Same reasoning as the 2026-07-15 roster-IDOR fix in mastery/override.)
 *
 * Validation is two-stage by necessity: Zod (in the route) can only check shape,
 * because "targets must advance along the mission map" depends on
 * Benchmark.sequenceOrder, which lives in the database.
 */

import { prisma } from '@/lib/db'
import { assertClassOwnedByTeacher, RosterError } from '@/lib/teacher-roster'
import {
  validateTargetOrder,
  validateCheckpointProgression,
  type LevelTarget,
  type TargetOrderProblem,
} from './levels'

/** Audit actions owned by this module. */
export const PROGRESS_CHECKPOINT_AUDIT_ACTIONS = {
  PROGRESS_TARGETS_UPDATED: 'PROGRESS_TARGETS_UPDATED',
} as const

export const CHECKPOINT_NUMBERS = [1, 2, 3, 4] as const
export const CHECKPOINT_COUNT = CHECKPOINT_NUMBERS.length

export class ProgressCheckpointError extends Error {
  constructor(
    message: string,
    public readonly code: 'FORBIDDEN' | 'NOT_FOUND' | 'INVALID_TARGETS',
    public readonly problems: TargetOrderProblem[] = []
  ) {
    super(message)
    this.name = 'ProgressCheckpointError'
  }
}

// ── Eligible target missions ──────────────────────────────────────────────────

export interface TargetOption {
  benchmarkId: string
  code: string
  title: string
  sequenceOrder: number
  unitId: string
  unitTitle: string
  unitSequenceOrder: number
  /** Whether this mission can be used as a target. */
  eligible: boolean
  /** Plain-language reason when not eligible — shown next to a disabled option. */
  unavailableReason: string | null
}

/**
 * Every SS.7.CG benchmark, with whether it can serve as a checkpoint target.
 *
 * A mission is only a usable target if a student can actually finish it: its unit
 * must be active AND it must have an APPROVED Mastery Challenge. Benchmarks with
 * an empty question bank have no Mastery Challenge at all, which makes them
 * impossible to master and impossible to off-ramp — pointing a Level at one would
 * make that Level permanently unreachable.
 *
 * Ineligible missions are returned (not filtered out) so the picker can show them
 * greyed out with the real reason rather than silently omitting them.
 */
export async function getTargetOptions(): Promise<TargetOption[]> {
  const benchmarks = await prisma.benchmark.findMany({
    where: { code: { startsWith: 'SS.7.CG.' } },
    orderBy: { sequenceOrder: 'asc' },
    select: {
      id: true,
      code: true,
      title: true,
      sequenceOrder: true,
      unit: { select: { id: true, title: true, sequenceOrder: true, active: true } },
      _count: {
        select: {
          assessments: {
            where: { assessmentType: 'MASTERY_CHALLENGE', approvalStatus: 'APPROVED' },
          },
        },
      },
    },
  })

  return benchmarks.map((b) => {
    const hasMasteryChallenge = b._count.assessments > 0
    let unavailableReason: string | null = null
    if (!b.unit.active) {
      unavailableReason = `Unit ${b.unit.sequenceOrder} — no content yet`
    } else if (!hasMasteryChallenge) {
      unavailableReason = 'No Mastery Challenge authored yet'
    }

    return {
      benchmarkId: b.id,
      code: b.code,
      title: b.title,
      sequenceOrder: b.sequenceOrder,
      unitId: b.unit.id,
      unitTitle: b.unit.title,
      unitSequenceOrder: b.unit.sequenceOrder,
      eligible: unavailableReason === null,
      unavailableReason,
    }
  })
}

// ── Plan resolution ───────────────────────────────────────────────────────────

/**
 * Which plan a class follows: its own if pinned, else the teacher's plan for that
 * class's school year. Returns null when the teacher has not configured one yet.
 *
 * Always reads the year off the Class row — Class.schoolYear is free text and must
 * never be inferred from the current date.
 */
export async function resolvePlanIdForClass(classId: string): Promise<string | null> {
  const klass = await prisma.class.findUnique({
    where: { id: classId },
    select: { progressPlanId: true, teacherId: true, schoolYear: true },
  })
  if (!klass) return null
  if (klass.progressPlanId) return klass.progressPlanId

  const plan = await prisma.progressPlan.findUnique({
    where: { teacherId_schoolYear: { teacherId: klass.teacherId, schoolYear: klass.schoolYear } },
    select: { id: true },
  })
  return plan?.id ?? null
}

// ── Read ──────────────────────────────────────────────────────────────────────

export interface CheckpointConfigView {
  checkpointNumber: number
  /** ISO date (YYYY-MM-DD), or null when not configured. */
  endsOn: string | null
  targets: { level: number; benchmarkId: string }[]
}

export interface ProgressPlanView {
  planId: string | null
  schoolYear: string
  /** True when this class is pinned to its own plan rather than the shared one. */
  usesOwnPlan: boolean
  /** Names of the teacher's classes this plan currently applies to. */
  appliesToClasses: { id: string; name: string; period: string | null }[]
  checkpoints: CheckpointConfigView[]
  targetOptions: TargetOption[]
  eligibleCount: number
  totalCount: number
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Empty config for all four checkpoints, used when nothing is configured yet. */
function emptyCheckpoints(): CheckpointConfigView[] {
  return CHECKPOINT_NUMBERS.map((n) => ({ checkpointNumber: n, endsOn: null, targets: [] }))
}

export async function getProgressPlanForClass(
  teacherUserId: string,
  classId: string
): Promise<ProgressPlanView> {
  await assertClassOwned(teacherUserId, classId)

  const klass = await prisma.class.findUnique({
    where: { id: classId },
    select: { teacherId: true, schoolYear: true, progressPlanId: true },
  })
  if (!klass) throw new ProgressCheckpointError('Class not found', 'NOT_FOUND')

  const planId = await resolvePlanIdForClass(classId)

  const [plan, targetOptions] = await Promise.all([
    planId
      ? prisma.progressPlan.findUnique({
          where: { id: planId },
          select: {
            id: true,
            schoolYear: true,
            checkpoints: {
              orderBy: { checkpointNumber: 'asc' },
              select: {
                checkpointNumber: true,
                endsOn: true,
                targets: {
                  orderBy: { level: 'asc' },
                  select: { level: true, benchmarkId: true },
                },
              },
            },
          },
        })
      : null,
    getTargetOptions(),
  ])

  // Every class of this teacher that resolves to this plan.
  const siblingClasses = await prisma.class.findMany({
    where: { teacherId: klass.teacherId, active: true },
    orderBy: [{ period: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, period: true, progressPlanId: true, schoolYear: true },
  })
  const appliesToClasses = siblingClasses
    .filter((c) =>
      planId === null
        ? false
        : c.progressPlanId === planId ||
          (c.progressPlanId === null &&
            c.schoolYear === (plan?.schoolYear ?? klass.schoolYear))
    )
    .map((c) => ({ id: c.id, name: c.name, period: c.period }))

  const configured = new Map(
    (plan?.checkpoints ?? []).map((cp) => [
      cp.checkpointNumber,
      {
        checkpointNumber: cp.checkpointNumber,
        endsOn: toIsoDate(cp.endsOn),
        targets: cp.targets.map((t) => ({ level: t.level, benchmarkId: t.benchmarkId })),
      },
    ])
  )

  return {
    planId,
    schoolYear: plan?.schoolYear ?? klass.schoolYear,
    usesOwnPlan: klass.progressPlanId !== null,
    appliesToClasses,
    checkpoints: emptyCheckpoints().map((empty) => configured.get(empty.checkpointNumber) ?? empty),
    targetOptions,
    eligibleCount: targetOptions.filter((o) => o.eligible).length,
    totalCount: targetOptions.length,
  }
}

// ── Write ─────────────────────────────────────────────────────────────────────

export interface CheckpointConfigInput {
  checkpointNumber: number
  /** ISO date (YYYY-MM-DD). Null clears the checkpoint entirely. */
  endsOn: string | null
  targets: { level: number; benchmarkId: string }[]
}

/**
 * Replace the plan's checkpoint configuration.
 *
 * Validates (stage 2) that every target is an eligible mission and that targets
 * advance along the map both within a checkpoint and across checkpoints, then
 * writes plan + checkpoints + targets and one audit row in a single transaction.
 */
export async function saveProgressTargets(
  teacherUserId: string,
  classId: string,
  input: CheckpointConfigInput[]
): Promise<{ planId: string }> {
  await assertClassOwned(teacherUserId, classId)

  const klass = await prisma.class.findUnique({
    where: { id: classId },
    select: { teacherId: true, schoolYear: true, progressPlanId: true },
  })
  if (!klass) throw new ProgressCheckpointError('Class not found', 'NOT_FOUND')

  // ── Stage 2 validation, against DB truth ───────────────────────────────────
  const options = await getTargetOptions()
  const optionByBenchmarkId = new Map(options.map((o) => [o.benchmarkId, o]))

  const problems: TargetOrderProblem[] = []
  const withSequence: { checkpointNumber: number; targets: LevelTarget[] }[] = []

  for (const cp of input) {
    const targets: LevelTarget[] = []
    for (const t of cp.targets) {
      const option = optionByBenchmarkId.get(t.benchmarkId)
      if (!option) {
        problems.push({
          code: 'NOT_INCREASING',
          message: `Checkpoint ${cp.checkpointNumber}, Level ${t.level}: unknown mission.`,
        })
        continue
      }
      if (!option.eligible) {
        problems.push({
          code: 'NOT_INCREASING',
          message:
            `Checkpoint ${cp.checkpointNumber}, Level ${t.level}: ${option.code} ` +
            `cannot be a target (${option.unavailableReason}).`,
        })
        continue
      }
      targets.push({
        level: t.level,
        benchmarkId: t.benchmarkId,
        sequenceOrder: option.sequenceOrder,
      })
    }
    problems.push(...validateTargetOrder(targets))
    withSequence.push({ checkpointNumber: cp.checkpointNumber, targets })
  }

  problems.push(...validateCheckpointProgression(withSequence))

  if (problems.length > 0) {
    throw new ProgressCheckpointError(
      'Checkpoint targets are not valid',
      'INVALID_TARGETS',
      problems
    )
  }

  // ── Snapshot "before" for the audit trail ──────────────────────────────────
  const existingPlanId = await resolvePlanIdForClass(classId)
  const before = existingPlanId
    ? await prisma.progressCheckpoint.findMany({
        where: { planId: existingPlanId },
        orderBy: { checkpointNumber: 'asc' },
        select: {
          checkpointNumber: true,
          endsOn: true,
          targets: { orderBy: { level: 'asc' }, select: { level: true, benchmarkId: true } },
        },
      })
    : []

  const planId = await prisma.$transaction(async (tx) => {
    // The plan the class already follows, or a new shared plan for its year.
    const plan = existingPlanId
      ? await tx.progressPlan.update({
          where: { id: existingPlanId },
          data: {},
          select: { id: true },
        })
      : await tx.progressPlan.create({
          data: { teacherId: klass.teacherId, schoolYear: klass.schoolYear },
          select: { id: true },
        })

    for (const cp of input) {
      if (cp.endsOn === null) {
        // Clearing a checkpoint removes it and (by cascade) its targets.
        await tx.progressCheckpoint.deleteMany({
          where: { planId: plan.id, checkpointNumber: cp.checkpointNumber },
        })
        continue
      }

      const endsOn = new Date(`${cp.endsOn}T00:00:00.000Z`)
      const checkpoint = await tx.progressCheckpoint.upsert({
        where: {
          planId_checkpointNumber: { planId: plan.id, checkpointNumber: cp.checkpointNumber },
        },
        create: { planId: plan.id, checkpointNumber: cp.checkpointNumber, endsOn },
        update: { endsOn },
        select: { id: true },
      })

      // Targets are replaced wholesale — simplest correct semantics for a form
      // that always submits the full ladder.
      await tx.progressCheckpointTarget.deleteMany({ where: { checkpointId: checkpoint.id } })
      const targets = withSequence.find(
        (w) => w.checkpointNumber === cp.checkpointNumber
      )!.targets
      if (targets.length > 0) {
        await tx.progressCheckpointTarget.createMany({
          data: targets.map((t) => ({
            checkpointId: checkpoint.id,
            level: t.level,
            benchmarkId: t.benchmarkId,
          })),
        })
      }
    }

    await tx.auditLog.create({
      data: {
        actorUserId: teacherUserId,
        action: PROGRESS_CHECKPOINT_AUDIT_ACTIONS.PROGRESS_TARGETS_UPDATED,
        entityType: 'ProgressPlan',
        entityId: plan.id,
        metadataJson: {
          classId,
          before: before.map((cp) => ({
            checkpointNumber: cp.checkpointNumber,
            endsOn: toIsoDate(cp.endsOn),
            targets: cp.targets.map((t) => ({ level: t.level, benchmarkId: t.benchmarkId })),
          })),
          after: input.map((cp) => ({
            checkpointNumber: cp.checkpointNumber,
            endsOn: cp.endsOn,
            targets: cp.targets.map((t) => ({ level: t.level, benchmarkId: t.benchmarkId })),
          })),
        },
      },
    })

    return plan.id
  })

  return { planId }
}

/**
 * Point a class at its own plan (split it off the shared one), or back at the
 * teacher's shared plan for its school year.
 */
export async function setClassUsesOwnPlan(
  teacherUserId: string,
  classId: string,
  useOwnPlan: boolean
): Promise<void> {
  await assertClassOwned(teacherUserId, classId)

  const klass = await prisma.class.findUnique({
    where: { id: classId },
    select: { teacherId: true, schoolYear: true, progressPlanId: true },
  })
  if (!klass) throw new ProgressCheckpointError('Class not found', 'NOT_FOUND')

  if (!useOwnPlan) {
    await prisma.class.update({ where: { id: classId }, data: { progressPlanId: null } })
    return
  }
  if (klass.progressPlanId) return // already split off

  // Copy the shared plan's configuration so splitting off is not destructive.
  const sharedPlanId = await resolvePlanIdForClass(classId)
  const source = sharedPlanId
    ? await prisma.progressCheckpoint.findMany({
        where: { planId: sharedPlanId },
        select: {
          checkpointNumber: true,
          endsOn: true,
          targets: { select: { level: true, benchmarkId: true } },
        },
      })
    : []

  await prisma.$transaction(async (tx) => {
    const plan = await tx.progressPlan.create({
      data: { teacherId: klass.teacherId, schoolYear: `${klass.schoolYear} · class ${classId}` },
      select: { id: true },
    })
    for (const cp of source) {
      const created = await tx.progressCheckpoint.create({
        data: { planId: plan.id, checkpointNumber: cp.checkpointNumber, endsOn: cp.endsOn },
        select: { id: true },
      })
      if (cp.targets.length > 0) {
        await tx.progressCheckpointTarget.createMany({
          data: cp.targets.map((t) => ({
            checkpointId: created.id,
            level: t.level,
            benchmarkId: t.benchmarkId,
          })),
        })
      }
    }
    await tx.class.update({ where: { id: classId }, data: { progressPlanId: plan.id } })
    await tx.auditLog.create({
      data: {
        actorUserId: teacherUserId,
        action: PROGRESS_CHECKPOINT_AUDIT_ACTIONS.PROGRESS_TARGETS_UPDATED,
        entityType: 'Class',
        entityId: classId,
        metadataJson: { classId, splitOntoOwnPlan: true, planId: plan.id },
      },
    })
  })
}

// ── Shared authorization helper ───────────────────────────────────────────────

async function assertClassOwned(teacherUserId: string, classId: string): Promise<void> {
  try {
    await assertClassOwnedByTeacher(teacherUserId, classId)
  } catch (err) {
    if (err instanceof RosterError) {
      throw new ProgressCheckpointError(
        `Class ${classId} is not owned by this teacher`,
        err.code === 'NOT_FOUND' ? 'NOT_FOUND' : 'FORBIDDEN'
      )
    }
    throw err
  }
}
