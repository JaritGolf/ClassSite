/**
 * Per-student nine-week checkpoint Levels across a teacher's classes.
 *
 * Unlike the rest of class-analytics, this is scoped PER CLASS rather than across
 * the flattened roster: checkpoint configuration lives on a plan that a class
 * points at, so two of a teacher's classes can legitimately be on different
 * schedules.
 *
 * Reading a class's table also locks any checkpoint whose date has passed
 * (roster-scoped), which is what makes the teacher's reported number stable.
 */

import { prisma } from '@/lib/db'
import { getTeacherRoster } from '@/lib/teacher-roster'
import {
  loadCheckpointContext,
  buildCheckpointViews,
  lockPlanForStudents,
  type CheckpointLevelView,
} from '@/lib/progress-checkpoints'

export interface CheckpointLevelRow {
  studentId: string
  displayName: string
  level: number
  maxLevel: number
  nextLevel: number | null
  missionsToNextLevel: number | null
  missionsCleared: number
  /** Higher level reached since a closed checkpoint — the teacher's call to act on. */
  caughtUpLevel: number | null
}

export interface ClassCheckpointLevels {
  classId: string
  className: string
  period: string | null
  checkpointNumber: number
  endsOn: Date
  isClosed: boolean
  /** Highest level this checkpoint can award, given how many targets are set. */
  maxLevel: number
  rows: CheckpointLevelRow[]
}

/**
 * Checkpoint standings for every class of the teacher that has a plan configured.
 * Classes with no configuration are omitted rather than shown empty.
 */
export async function getCheckpointLevelsForTeacher(
  teacherUserId: string,
  now: Date = new Date()
): Promise<ClassCheckpointLevels[]> {
  const roster = await getTeacherRoster(teacherUserId)
  if (roster.classes.length === 0) return []

  const out: ClassCheckpointLevels[] = []

  for (const klass of roster.classes) {
    const table = await buildClassTable(klass, now)
    if (table) out.push(table)
  }

  return out
}

async function buildClassTable(
  klass: { id: string; name: string; period: string | null; studentIds: string[] },
  now: Date
): Promise<ClassCheckpointLevels | null> {
  const ctx = await loadCheckpointContext(klass.id)
  if (!ctx || ctx.checkpoints.length === 0) return null

  // The checkpoint in play: the first still-open one, else the last closed one.
  const views = ctx.checkpoints
  const openIdx = views.findIndex((cp) => now.getTime() < cp.endsOn.getTime())
  const focus = openIdx >= 0 ? views[openIdx] : views[views.length - 1]

  if (klass.studentIds.length === 0) {
    return {
      classId: klass.id,
      className: klass.name,
      period: klass.period,
      checkpointNumber: focus.checkpointNumber,
      endsOn: focus.endsOn,
      isClosed: false,
      maxLevel: focus.targets.length,
      rows: [],
    }
  }

  const [students, progress, locked] = await Promise.all([
    prisma.student.findMany({
      where: { id: { in: klass.studentIds } },
      select: { id: true, user: { select: { firstName: true, lastName: true } } },
    }),
    prisma.studentProgress.findMany({
      where: { studentId: { in: klass.studentIds } },
      select: {
        studentId: true,
        benchmarkId: true,
        status: true,
        masteredAt: true,
        offRampTriggeredAt: true,
      },
    }),
    // Roster-scoped locking: a teacher's read is the right place to snapshot the
    // whole class, unlike a student's own page read.
    lockPlanForStudents(ctx.checkpoints, ctx.sequenceOrderByBenchmarkId, klass.studentIds, now),
  ])

  const progressByStudent = new Map<string, typeof progress>()
  for (const id of klass.studentIds) progressByStudent.set(id, [])
  for (const p of progress) progressByStudent.get(p.studentId)?.push(p)

  const rows: CheckpointLevelRow[] = []
  let isClosed = false
  let maxLevel = focus.targets.length

  for (const s of students) {
    const views = buildCheckpointViews(
      ctx,
      progressByStudent.get(s.id) ?? [],
      locked.get(s.id) ?? new Map(),
      now
    )
    const view = views.find((v) => v.checkpointNumber === focus.checkpointNumber)
    if (!view) continue
    isClosed = view.isClosed
    maxLevel = view.maxLevel

    rows.push({
      studentId: s.id,
      displayName: `${s.user.firstName} ${s.user.lastName}`,
      level: view.level,
      maxLevel: view.maxLevel,
      nextLevel: view.nextLevel,
      missionsToNextLevel: view.missionsToNextLevel,
      missionsCleared: view.missionsCleared,
      caughtUpLevel: view.caughtUpLevel,
    })
  }

  // Lowest level first — who needs attention, not a ranking to display publicly.
  rows.sort((a, b) => a.level - b.level || a.displayName.localeCompare(b.displayName))

  return {
    classId: klass.id,
    className: klass.name,
    period: klass.period,
    checkpointNumber: focus.checkpointNumber,
    endsOn: focus.endsOn,
    isClosed,
    maxLevel,
    rows,
  }
}

/** Re-export for consumers that only need the view type. */
export type { CheckpointLevelView }
