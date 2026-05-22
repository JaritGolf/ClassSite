/**
 * Students in remediation for a specific benchmark.
 */

import { prisma } from '@/lib/db'
import { resolveTeacherId, getTeacherRoster } from '@/lib/teacher-roster'
import type { RemediationType, RemediationStatus } from '@prisma/client'

export interface StudentRemediationRow {
  studentId: string
  displayName: string
  remediationType: RemediationType
  assignedAt: Date
  status: RemediationStatus
}

export async function getStudentsInRemediation(
  teacherUserId: string,
  benchmarkId: string
): Promise<StudentRemediationRow[]> {
  await resolveTeacherId(teacherUserId)
  const roster = await getTeacherRoster(teacherUserId)
  if (roster.allStudentIds.length === 0) return []

  const remediations = await prisma.studentRemediation.findMany({
    where: {
      studentId: { in: roster.allStudentIds },
      benchmarkId,
    },
    select: {
      studentId: true,
      assignedAt: true,
      status: true,
      remediationItem: { select: { remediationType: true } },
      student: {
        select: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { assignedAt: 'desc' },
  })

  return remediations.map((r) => ({
    studentId: r.studentId,
    displayName: `${r.student.user.firstName} ${r.student.user.lastName}`,
    remediationType: r.remediationItem.remediationType,
    assignedAt: r.assignedAt,
    status: r.status,
  }))
}
