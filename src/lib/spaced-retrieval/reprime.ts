/**
 * Class Re-Priming
 *
 * A teacher intervention: when a benchmark is decaying across a class, the
 * teacher re-primes it — halve the SM-2 interval on the class's
 * SpacedReviewState rows and pull `dueAt` forward so the material resurfaces
 * in the Daily Republic Drill sooner. Optionally scoped to one benchmark;
 * otherwise all benchmarks for the class's students.
 *
 * This replaces the Phase-9 stub that only wrote an audit log. Reuses the
 * SM-2 `halveInterval` / `computeDueAt` helpers (spec Section 15.4–15.5).
 */

import { prisma } from '@/lib/db'
import { assertClassOwnedByTeacher, RosterError } from '@/lib/teacher-roster'
import { halveInterval, computeDueAt } from './sm2'

export class ReprimeError extends Error {
  constructor(
    public readonly code: 'FORBIDDEN' | 'NOT_FOUND',
    message: string
  ) {
    super(message)
    this.name = 'ReprimeError'
  }
}

export interface ReprimeResult {
  affectedStates: number
  studentsAffected: number
  benchmarkId: string | null
}

export async function reprimeClass(
  teacherUserId: string,
  classId: string,
  benchmarkId?: string,
  now: Date = new Date()
): Promise<ReprimeResult> {
  // Roster scope — a teacher may only re-prime a class they own.
  try {
    await assertClassOwnedByTeacher(teacherUserId, classId)
  } catch (err) {
    if (err instanceof RosterError) {
      throw new ReprimeError(
        err.code === 'NOT_FOUND' ? 'NOT_FOUND' : 'FORBIDDEN',
        `Class ${classId} is not owned by this teacher`
      )
    }
    throw err
  }

  const enrollments = await prisma.classEnrollment.findMany({
    where: { classId, status: 'ACTIVE' },
    select: { studentId: true },
  })
  const studentIds = enrollments.map((e) => e.studentId)

  const states =
    studentIds.length === 0
      ? []
      : await prisma.spacedReviewState.findMany({
          where: {
            studentId: { in: studentIds },
            ...(benchmarkId ? { benchmarkId } : {}),
          },
          select: { id: true, studentId: true, intervalDays: true, dueAt: true },
        })

  const affectedStudents = new Set<string>()

  await prisma.$transaction(async (tx) => {
    for (const s of states) {
      const newInterval = halveInterval(s.intervalDays)
      const pulledDueAt = computeDueAt(newInterval, now)
      // Never delay an item: keep the earlier of the current and the new dueAt.
      const nextDueAt = pulledDueAt < s.dueAt ? pulledDueAt : s.dueAt
      await tx.spacedReviewState.update({
        where: { id: s.id },
        data: { intervalDays: newInterval, dueAt: nextDueAt },
      })
      affectedStudents.add(s.studentId)
    }

    await tx.auditLog.create({
      data: {
        actorUserId: teacherUserId,
        action: 'TRIGGER_CLASS_REPRIMING',
        entityType: 'Class',
        entityId: classId,
        metadataJson: {
          classId,
          benchmarkId: benchmarkId ?? null,
          affectedStates: states.length,
          studentsAffected: affectedStudents.size,
        },
      },
    })
  })

  return {
    affectedStates: states.length,
    studentsAffected: affectedStudents.size,
    benchmarkId: benchmarkId ?? null,
  }
}
