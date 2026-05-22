/**
 * GET /api/teacher/dashboard
 *
 * Returns all §22.2 class-level metrics composed into a single response.
 * Access: TEACHER and ADMIN only.
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { RosterError } from '@/lib/teacher-roster'
import {
  getClassStatusDistribution,
  getClassMasteryByBenchmark,
  getClassMasteryByReportingCategory,
  getClassMasteryByUnit,
  getMostMissedQuestions,
  getCommonMisconceptions,
  getStudentsNeedingAction,
  getRemediationCompletionStatus,
  getRecommendedSmallGroups,
  getEocReadinessTrend,
  getOffRampStudents,
} from '@/lib/class-analytics'
import { getClassDecayRates } from '@/lib/spaced-retrieval/decay'
import { getTeacherRoster } from '@/lib/teacher-roster'

export async function GET() {
  const session = await requireAuth(['TEACHER'])
  try {
    const userId = session.user.userId

    const roster = await getTeacherRoster(userId)

    const [
      statusDistribution,
      masteryByBenchmark,
      masteryByReportingCategory,
      masteryByUnit,
      mostMissedQuestions,
      commonMisconceptions,
      studentsNeedingAction,
      remediationCompletion,
      recommendedSmallGroups,
      eocReadinessTrend,
      offRampStudents,
      classDecayRates,
    ] = await Promise.all([
      getClassStatusDistribution(userId),
      getClassMasteryByBenchmark(userId),
      getClassMasteryByReportingCategory(userId),
      getClassMasteryByUnit(userId),
      getMostMissedQuestions(userId),
      getCommonMisconceptions(userId),
      getStudentsNeedingAction(userId),
      getRemediationCompletionStatus(userId),
      getRecommendedSmallGroups(userId),
      getEocReadinessTrend(userId),
      getOffRampStudents(userId),
      getClassDecayRates(roster.teacherId),
    ])

    return NextResponse.json({
      statusDistribution,
      masteryByBenchmark,
      masteryByReportingCategory,
      masteryByUnit,
      mostMissedQuestions,
      commonMisconceptions,
      studentsNeedingAction,
      remediationCompletion,
      recommendedSmallGroups,
      eocReadinessTrend,
      offRampStudents,
      classDecayRates,
    })
  } catch (e: unknown) {
    if (e instanceof RosterError) {
      const status = e.code === 'FORBIDDEN' ? 403 : 404
      return NextResponse.json({ error: e.code }, { status })
    }
    throw e
  }
}
