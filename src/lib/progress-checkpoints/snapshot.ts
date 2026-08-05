/**
 * Progress checkpoints — lazy locking.
 *
 * Once a checkpoint's end date has passed, each student's level is written to
 * StudentCheckpointLevel so the number never changes underneath a teacher who has
 * already reported it. Writing happens lazily on the first read after the date.
 *
 * Idempotency comes from the DB: `@@unique([checkpointId, studentId])` plus
 * `createMany({ skipDuplicates: true })`. That is deliberately stronger than the
 * older `getOrCreateDailyClassSnapshot` precedent in eoc-analytics, whose table has
 * no unique constraint and which therefore only *tolerates* duplicate rows.
 *
 * `targetsJson` freezes the targets that produced each level. Targets stay
 * editable afterwards, so without the frozen copy a locked row would report a
 * level nobody could reconstruct.
 */

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import {
  computeCheckpointLevel,
  clearedBenchmarkIdsAsOf,
  endOfSchoolDayUtc,
  isCheckpointClosed,
  type ClearableRow,
  type LevelTarget,
} from './levels'

export interface LockableCheckpoint {
  id: string
  checkpointNumber: number
  endsOn: Date
  targets: LevelTarget[]
}

export interface LockedLevel {
  level: number
  missionsCleared: number
}

/**
 * Lock every closed checkpoint for the given students, then return the locked
 * values (including rows that already existed).
 *
 * Scope is the caller's responsibility and it matters: a STUDENT's own page read
 * should pass only that student, while a teacher's roster view passes the roster.
 * A student read must never write rows for their classmates.
 */
export async function lockCheckpointsForStudents(
  checkpoints: LockableCheckpoint[],
  sequenceOrderByBenchmarkId: Map<string, number>,
  studentIds: string[],
  progressByStudent: Map<string, ClearableRow[]>,
  now: Date
): Promise<Map<string, Map<string, LockedLevel>>> {
  const result = new Map<string, Map<string, LockedLevel>>()
  for (const id of studentIds) result.set(id, new Map())

  const closed = checkpoints.filter((cp) => isCheckpointClosed(cp.endsOn, now))
  if (closed.length === 0 || studentIds.length === 0) return result

  const closedIds = closed.map((cp) => cp.id)

  // What is already locked?
  const existing = await prisma.studentCheckpointLevel.findMany({
    where: { checkpointId: { in: closedIds }, studentId: { in: studentIds } },
    select: { checkpointId: true, studentId: true, level: true, missionsCleared: true },
  })
  const existingKeys = new Set(existing.map((r) => `${r.checkpointId}:${r.studentId}`))
  for (const row of existing) {
    result
      .get(row.studentId)
      ?.set(row.checkpointId, { level: row.level, missionsCleared: row.missionsCleared })
  }

  // Compute the missing ones.
  const toCreate: Prisma.StudentCheckpointLevelCreateManyInput[] = []

  for (const cp of closed) {
    const cutoff = endOfSchoolDayUtc(cp.endsOn)
    for (const studentId of studentIds) {
      if (existingKeys.has(`${cp.id}:${studentId}`)) continue

      const rows = progressByStudent.get(studentId) ?? []
      const cleared = clearedBenchmarkIdsAsOf(rows, cutoff)
      const outcome = computeCheckpointLevel(cp.targets, cleared)
      const missionsCleared = [...cleared].filter((id) =>
        sequenceOrderByBenchmarkId.has(id)
      ).length

      toCreate.push({
        checkpointId: cp.id,
        studentId,
        level: outcome.level,
        missionsCleared,
        targetsJson: cp.targets.map((t) => ({
          level: t.level,
          benchmarkId: t.benchmarkId,
          sequenceOrder: t.sequenceOrder,
        })),
        lockedAt: now,
      })

      result.get(studentId)?.set(cp.id, { level: outcome.level, missionsCleared })
    }
  }

  if (toCreate.length > 0) {
    // skipDuplicates makes this safe against a concurrent read locking the same
    // (checkpoint, student) pair — the unique index arbitrates, no P2002 handling.
    await prisma.studentCheckpointLevel.createMany({
      data: toCreate,
      skipDuplicates: true,
    })
  }

  return result
}

/**
 * Lock every closed checkpoint of a plan for a set of students, loading their
 * progress rows internally. Used by the manual lock script and the teacher view.
 */
export async function lockPlanForStudents(
  checkpoints: LockableCheckpoint[],
  sequenceOrderByBenchmarkId: Map<string, number>,
  studentIds: string[],
  now: Date = new Date()
): Promise<Map<string, Map<string, LockedLevel>>> {
  if (studentIds.length === 0) return new Map()

  const rows = await prisma.studentProgress.findMany({
    where: { studentId: { in: studentIds } },
    select: {
      studentId: true,
      benchmarkId: true,
      status: true,
      masteredAt: true,
      offRampTriggeredAt: true,
    },
  })

  const progressByStudent = new Map<string, ClearableRow[]>()
  for (const id of studentIds) progressByStudent.set(id, [])
  for (const r of rows) {
    progressByStudent.get(r.studentId)?.push({
      benchmarkId: r.benchmarkId,
      status: r.status,
      masteredAt: r.masteredAt,
      offRampTriggeredAt: r.offRampTriggeredAt,
    })
  }

  return lockCheckpointsForStudents(
    checkpoints,
    sequenceOrderByBenchmarkId,
    studentIds,
    progressByStudent,
    now
  )
}
