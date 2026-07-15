/**
 * Get a teacher's full roster: classes + student IDs
 */

import { prisma } from '@/lib/db'
import { resolveTeacherId } from './resolve'

export interface TeacherRoster {
  teacherId: string
  schoolId: string | null
  classes: Array<{
    id: string
    name: string
    period: string | null
    subPrepNotes: string | null
    studentIds: string[]
  }>
  allStudentIds: string[]
}

export async function getTeacherRoster(
  teacherUserId: string
): Promise<TeacherRoster> {
  const teacherId = await resolveTeacherId(teacherUserId)

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: {
      schoolId: true,
      classes: {
        where: { active: true },
        select: {
          id: true,
          name: true,
          period: true,
          subPrepNotes: true,
          enrollments: {
            where: { status: 'ACTIVE' },
            select: { studentId: true },
          },
        },
      },
    },
  })

  if (!teacher) {
    return { teacherId, schoolId: null, classes: [], allStudentIds: [] }
  }

  const classes = teacher.classes.map((c) => ({
    id: c.id,
    name: c.name,
    period: c.period,
    subPrepNotes: c.subPrepNotes,
    studentIds: c.enrollments.map((e) => e.studentId),
  }))

  const allStudentIds = [...new Set(classes.flatMap((c) => c.studentIds))]

  return {
    teacherId,
    schoolId: teacher.schoolId,
    classes,
    allStudentIds,
  }
}
