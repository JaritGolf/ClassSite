/**
 * Class-wide status distribution across all student progress rows.
 */

import { prisma } from '@/lib/db'
import { getTeacherRoster } from '@/lib/teacher-roster'

export interface ClassStatusDistribution {
  notStarted: number
  inProgress: number
  readyForMastery: number
  needsRemediation: number
  remediationComplete: number
  mastered: number
  exposureComplete: number
  teacherOverride: number
  interventionRequired: number
}

export async function getClassStatusDistribution(
  teacherUserId: string
): Promise<ClassStatusDistribution> {
  const roster = await getTeacherRoster(teacherUserId)

  const dist: ClassStatusDistribution = {
    notStarted: 0,
    inProgress: 0,
    readyForMastery: 0,
    needsRemediation: 0,
    remediationComplete: 0,
    mastered: 0,
    exposureComplete: 0,
    teacherOverride: 0,
    interventionRequired: 0,
  }

  if (roster.allStudentIds.length === 0) return dist

  const progressRows = await prisma.studentProgress.findMany({
    where: { studentId: { in: roster.allStudentIds } },
    select: { status: true },
  })

  for (const row of progressRows) {
    switch (row.status) {
      case 'NOT_STARTED':
        dist.notStarted++
        break
      case 'IN_PROGRESS':
        dist.inProgress++
        break
      case 'READY_FOR_MASTERY':
        dist.readyForMastery++
        break
      case 'NEEDS_REMEDIATION':
        dist.needsRemediation++
        break
      case 'REMEDIATION_COMPLETE':
        dist.remediationComplete++
        break
      case 'MASTERED':
        dist.mastered++
        break
      case 'EXPOSURE_COMPLETE':
        dist.exposureComplete++
        break
      case 'TEACHER_OVERRIDE':
        dist.teacherOverride++
        break
      case 'INTERVENTION_REQUIRED':
        dist.interventionRequired++
        break
    }
  }

  return dist
}
