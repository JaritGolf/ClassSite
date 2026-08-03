/**
 * Suggestion Box — the teacher visibility predicate (ADR 0021).
 *
 * ONE definition, used by BOTH `list.ts` (what a teacher can read) and `review.ts`
 * (what a teacher can triage). Keeping them on a single predicate is what stops
 * "can see" and "can act on" from drifting apart over time.
 *
 * A teacher sees a student-authored suggestion when EITHER:
 *   (a) it was snapshotted to them at submit time (`teacherId`), OR
 *   (b) its author is currently in their roster (`authorStudentId`).
 *
 * Why both:
 *   - snapshot alone loses suggestions filed before the student was enrolled
 *     anywhere (teacherId is null on those rows);
 *   - roster alone means a mid-year transfer yanks a student's entire feedback
 *     history out of Teacher A's queue and drops it, contextless, into B's.
 * The union costs nothing extra — /teacher/reports already loads the roster — and
 * it handles co-taught students with one row instead of fan-out.
 */

import type { Prisma } from '@prisma/client'
import { getTeacherRoster, resolveTeacherId } from '@/lib/teacher-roster'

export interface TeacherScope {
  teacherId: string
  studentIds: string[]
  classIds: string[]
  /** OR predicate over the two visibility branches. */
  where: Prisma.SuggestionWhereInput
}

/**
 * Throws `RosterError('FORBIDDEN')` (from @/lib/teacher-roster) when the user has
 * no Teacher row. Callers propagate it as-is — the existing typed error is the
 * right one; translating it would just add a second vocabulary.
 */
export async function resolveTeacherScope(teacherUserId: string): Promise<TeacherScope> {
  const teacherId = await resolveTeacherId(teacherUserId)
  const roster = await getTeacherRoster(teacherUserId)
  const studentIds = roster.allStudentIds
  const classIds = roster.classes.map((c) => c.id)

  const branches: Prisma.SuggestionWhereInput[] = [{ teacherId }]
  // An empty `in: []` matches nothing in Postgres, which is correct here, but
  // omitting the branch keeps the generated SQL clean for the common empty case.
  if (studentIds.length > 0) {
    branches.push({ authorStudentId: { in: studentIds } })
  }

  return { teacherId, studentIds, classIds, where: { OR: branches } }
}

/** In-memory form of the same predicate, for authorizing a single already-loaded row. */
export function isVisibleToTeacherScope(
  scope: TeacherScope,
  row: { teacherId: string | null; authorStudentId: string | null }
): boolean {
  if (row.teacherId !== null && row.teacherId === scope.teacherId) return true
  if (row.authorStudentId !== null && scope.studentIds.includes(row.authorStudentId)) return true
  return false
}
