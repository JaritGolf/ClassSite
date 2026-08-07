/**
 * Authorization guards for teacher-scoped operations
 */

import { prisma } from '@/lib/db'
import { getTeacherRoster } from './roster'
import { RosterError } from './index'
import type { Student } from '@prisma/client'

/**
 * Assert that a student is enrolled in one of the teacher's classes.
 * Throws RosterError('FORBIDDEN') if not.
 */
export async function assertStudentInTeacherClass(
  teacherUserId: string,
  studentId: string
): Promise<void> {
  const roster = await getTeacherRoster(teacherUserId)
  if (!roster.allStudentIds.includes(studentId)) {
    throw new RosterError(
      'FORBIDDEN',
      `Student ${studentId} is not in any of this teacher's classes`
    )
  }
}

/**
 * Assert that a class is owned by the teacher.
 * Throws RosterError('FORBIDDEN') if not.
 */
export async function assertClassOwnedByTeacher(
  teacherUserId: string,
  classId: string
): Promise<void> {
  const roster = await getTeacherRoster(teacherUserId)
  const owned = roster.classes.some((c) => c.id === classId)
  if (!owned) {
    throw new RosterError(
      'FORBIDDEN',
      `Class ${classId} is not owned by this teacher`
    )
  }
}

/**
 * Assert that EVERY class is owned by the teacher, on ONE roster query.
 *
 * `assertClassOwnedByTeacher` re-runs the full roster query per call, so
 * guarding a multi-class save in a loop fires N identical queries before any
 * write — a teacher applying one change to five periods paid for five. Prefer
 * this wherever a request names more than one class.
 *
 * Fails on the FIRST class the teacher does not own and names it, so a request
 * mentioning one foreign class never partially applies to the classes they do
 * own. An empty list is an input error, not a vacuous pass — silently
 * succeeding on "apply to no classes" would look like a save that worked.
 */
export async function assertClassesOwnedByTeacher(
  teacherUserId: string,
  classIds: readonly string[]
): Promise<void> {
  if (classIds.length === 0) {
    throw new RosterError('NOT_FOUND', 'At least one class must be selected')
  }
  const roster = await getTeacherRoster(teacherUserId)
  const owned = new Set(roster.classes.map((c) => c.id))
  const foreign = classIds.find((id) => !owned.has(id))
  if (foreign) {
    throw new RosterError('FORBIDDEN', `Class ${foreign} is not owned by this teacher`)
  }
}

/**
 * Return the Student record for a student enrolled in the teacher's class.
 * Throws RosterError('FORBIDDEN') if not enrolled, RosterError('NOT_FOUND')
 * if the student record doesn't exist.
 */
export async function getStudentInTeacherClass(
  teacherUserId: string,
  studentId: string
): Promise<Student> {
  await assertStudentInTeacherClass(teacherUserId, studentId)

  const student = await prisma.student.findUnique({
    where: { id: studentId },
  })

  if (!student) {
    throw new RosterError('NOT_FOUND', `Student ${studentId} not found`)
  }

  return student
}
