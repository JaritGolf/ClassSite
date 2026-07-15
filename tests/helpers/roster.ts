/**
 * Test helper: put a student in a teacher's roster.
 *
 * The teacher-scoped mutations (applyTeacherOverride, setAccommodation) now
 * refuse to act on a student who is not enrolled in one of the caller's
 * classes (roster IDOR guard). Suites that call those functions directly must
 * first enroll their test student in a class owned by the test teacher.
 *
 * Idempotent: reuses an existing class/enrollment on repeat calls. Scoped by a
 * deterministic class name so cleanup can target it.
 */

import type { PrismaClient } from '@prisma/client'

export const TEST_ROSTER_CLASS_NAME = 'Test Roster Class'

export async function enrollStudentWithTeacher(
  prisma: PrismaClient,
  teacherUserId: string,
  studentId: string
): Promise<{ classId: string }> {
  const teacher = await prisma.teacher.findUnique({
    where: { userId: teacherUserId },
    select: { id: true },
  })
  if (!teacher) throw new Error(`No teacher for userId ${teacherUserId}`)

  let klass = await prisma.class.findFirst({
    where: { teacherId: teacher.id, name: TEST_ROSTER_CLASS_NAME },
    select: { id: true },
  })
  if (!klass) {
    klass = await prisma.class.create({
      data: {
        teacherId: teacher.id,
        name: TEST_ROSTER_CLASS_NAME,
        schoolYear: '2025-2026',
      },
      select: { id: true },
    })
  }

  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId: klass.id, studentId } },
    create: { classId: klass.id, studentId, status: 'ACTIVE' },
    update: { status: 'ACTIVE' },
  })

  return { classId: klass.id }
}

/**
 * Remove the test roster class + its enrollments for a teacher. Call in
 * afterAll before deleting the teacher/students (FK order).
 */
export async function cleanupTestRoster(
  prisma: PrismaClient,
  teacherUserId: string
): Promise<void> {
  const teacher = await prisma.teacher.findUnique({
    where: { userId: teacherUserId },
    select: { id: true },
  })
  if (!teacher) return
  const classes = await prisma.class.findMany({
    where: { teacherId: teacher.id, name: TEST_ROSTER_CLASS_NAME },
    select: { id: true },
  })
  const classIds = classes.map((c) => c.id)
  if (classIds.length === 0) return
  await prisma.classEnrollment.deleteMany({ where: { classId: { in: classIds } } })
  await prisma.class.deleteMany({ where: { id: { in: classIds } } })
}
