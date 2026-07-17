/**
 * Per-student Test-Taking Strategy completion across the teacher's roster.
 * Counts correct apply-it "uses" per student and compares against the
 * resolved requirement (class global, minus per-student overrides/waivers).
 */

import { prisma } from '@/lib/db'
import { getTeacherRoster } from '@/lib/teacher-roster'
import { getStrategyMissions } from '@/lib/strategy-track'

export interface StrategyCompletionRow {
  studentId: string
  displayName: string
  totalUses: number
  missionsMet: number
  missionsRequired: number
  owed: number
}

export async function getStrategyCompletionStatus(
  teacherUserId: string
): Promise<StrategyCompletionRow[]> {
  const roster = await getTeacherRoster(teacherUserId)
  if (roster.allStudentIds.length === 0) return []
  const ids = roster.allStudentIds
  const missionCodes = getStrategyMissions().map((m) => m.code)

  const [students, enrollments, overrides, progress] = await Promise.all([
    prisma.student.findMany({
      where: { id: { in: ids } },
      select: { id: true, user: { select: { firstName: true, lastName: true } } },
    }),
    prisma.classEnrollment.findMany({
      where: { studentId: { in: ids }, status: 'ACTIVE' },
      orderBy: { enrolledAt: 'asc' },
      select: { studentId: true, class: { select: { strategyUsesRequired: true } } },
    }),
    prisma.studentStrategyOverride.findMany({
      where: { studentId: { in: ids } },
      select: { studentId: true, missionCode: true, requiredUses: true, waived: true },
    }),
    prisma.strategyTrackProgress.findMany({
      where: { studentId: { in: ids } },
      select: { studentId: true, missionCode: true, useCount: true },
    }),
  ])

  // First ACTIVE class's global per student (enrollments are enrolledAt-asc).
  const classGlobalByStudent = new Map<string, number>()
  for (const e of enrollments) {
    if (!classGlobalByStudent.has(e.studentId)) {
      classGlobalByStudent.set(e.studentId, e.class.strategyUsesRequired)
    }
  }

  const overrideByKey = new Map<
    string,
    { requiredUses: number | null; waived: boolean }
  >()
  for (const o of overrides) {
    overrideByKey.set(`${o.studentId}:${o.missionCode}`, o)
  }

  const useByKey = new Map<string, number>()
  for (const p of progress) {
    useByKey.set(`${p.studentId}:${p.missionCode}`, p.useCount)
  }

  return students
    .map((s) => {
      const classGlobal = classGlobalByStudent.get(s.id) ?? 0
      let totalUses = 0
      let missionsRequired = 0
      let missionsMet = 0
      let owed = 0

      for (const code of missionCodes) {
        const useCount = useByKey.get(`${s.id}:${code}`) ?? 0
        totalUses += useCount

        const o = overrideByKey.get(`${s.id}:${code}`)
        const required = o?.waived ? 0 : o?.requiredUses ?? classGlobal
        if (required > 0) {
          missionsRequired++
          if (useCount >= required) missionsMet++
          owed += Math.max(0, required - useCount)
        }
      }

      return {
        studentId: s.id,
        displayName: `${s.user.firstName} ${s.user.lastName}`,
        totalUses,
        missionsMet,
        missionsRequired,
        owed,
      }
    })
    .sort((a, b) => b.owed - a.owed || a.displayName.localeCompare(b.displayName))
}
