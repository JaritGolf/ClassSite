/**
 * Students who have triggered the off-ramp.
 */

import { prisma } from '@/lib/db'
import { getTeacherRoster } from '@/lib/teacher-roster'

export interface OffRampRow {
  studentId: string
  displayName: string
  benchmarkCode: string
  triggeredAt: Date
  conferenceLogged: boolean
}

export async function getOffRampStudents(
  teacherUserId: string
): Promise<OffRampRow[]> {
  const roster = await getTeacherRoster(teacherUserId)
  if (roster.allStudentIds.length === 0) return []

  const offRampRows = await prisma.studentProgress.findMany({
    where: {
      studentId: { in: roster.allStudentIds },
      offRampTriggeredAt: { not: null },
    },
    select: {
      studentId: true,
      offRampTriggeredAt: true,
      benchmark: { select: { code: true } },
      student: {
        select: {
          user: { select: { firstName: true, lastName: true } },
          teacherOverrides: {
            where: { action: 'CUSTOM' },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
    orderBy: { offRampTriggeredAt: 'desc' },
  })

  return offRampRows.map((row) => ({
    studentId: row.studentId,
    displayName: `${row.student.user.firstName} ${row.student.user.lastName}`,
    benchmarkCode: row.benchmark.code,
    triggeredAt: row.offRampTriggeredAt!,
    // Conference logged = any CUSTOM override exists for this student (Phase 9 uses CUSTOM for conference notes)
    conferenceLogged: row.student.teacherOverrides.length > 0,
  }))
}
