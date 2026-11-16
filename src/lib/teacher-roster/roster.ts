/**
 * Get a teacher's classes.
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
  }>
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
        },
      },
    },
  })

  if (!teacher) {
    return { teacherId, schoolId: null, classes: [] }
  }

  const classes = teacher.classes.map((c) => ({
    id: c.id,
    name: c.name,
    period: c.period,
    subPrepNotes: c.subPrepNotes,
  }))


  return {
    teacherId,
    schoolId: teacher.schoolId,
    classes,
  }
}
