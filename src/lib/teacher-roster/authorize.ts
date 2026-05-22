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
