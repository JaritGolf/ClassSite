/**
 * Teacher Dashboard — Phase 9a rewrite.
 * Renders all §22.2 class metrics via class-analytics domain functions.
 */

import { requireAuth } from '@/lib/auth'
import {
  getClassStatusDistribution,
  getClassMasteryByBenchmark,
  getClassMasteryByUnit,
  getMostMissedQuestions,
  getCommonMisconceptions,
  getStudentsNeedingAction,
  getRecommendedSmallGroups,
  getEocReadinessTrend,
  getOffRampStudents,
} from '@/lib/class-analytics'
import { getClassDecayRates } from '@/lib/spaced-retrieval/decay'
import { getTeacherRoster } from '@/lib/teacher-roster'
import { StatCard } from '@/components/teacher/dashboard/StatCard'
import { ClassProgressCard } from '@/components/teacher/dashboard/ClassProgressCard'
import { StatusDistribution } from '@/components/teacher/dashboard/StatusDistribution'
import { MostMissedQuestionsTable } from '@/components/teacher/dashboard/MostMissedQuestionsTable'
import { MisconceptionsTable } from '@/components/teacher/dashboard/MisconceptionsTable'
import { DecayAlerts } from '@/components/teacher/dashboard/DecayAlerts'
import { OffRampList } from '@/components/teacher/dashboard/OffRampList'
import { RecommendedSmallGroups } from '@/components/teacher/dashboard/RecommendedSmallGroups'
import { EocReadinessTrendChart } from '@/components/teacher/dashboard/EocReadinessTrendChart'

export default async function TeacherDashboard() {
  const session = await requireAuth(['TEACHER'])
  const userId = session.user.userId

  const roster = await getTeacherRoster(userId)

  const [
    statusDistribution,
    masteryByUnit,
    masteryByBenchmark,
    mostMissed,
    misconceptions,
    studentsNeedingAction,
    smallGroups,
    eocTrend,
    offRampStudents,
    decayRates,
  ] = await Promise.all([
    getClassStatusDistribution(userId),
    getClassMasteryByUnit(userId),
    getClassMasteryByBenchmark(userId),
    getMostMissedQuestions(userId),
    getCommonMisconceptions(userId),
    getStudentsNeedingAction(userId),
    getRecommendedSmallGroups(userId),
    getEocReadinessTrend(userId),
    getOffRampStudents(userId),
    getClassDecayRates(roster.teacherId),
  ])

  const totalStudents = roster.allStudentIds.length
  const masteryRateAll =
    masteryByBenchmark.length === 0
      ? 0
      : Math.round(
          masteryByBenchmark.reduce((s, r) => s + r.masteryRatePercent, 0) /
            masteryByBenchmark.length
        )
  const spikeCount = decayRates.filter((d) => d.spikeAlert).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Class Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {roster.classes.length} class{roster.classes.length !== 1 ? 'es' : ''} · {totalStudents} students
        </p>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Students" value={totalStudents} />
        <StatCard
          label="Avg Mastery Rate"
          value={`${masteryRateAll}%`}
          alert={masteryRateAll < 40 ? 'warn' : undefined}
        />
        <StatCard
          label="Needs Action"
          value={studentsNeedingAction.length}
          alert={studentsNeedingAction.length > 0 ? 'warn' : undefined}
        />
        <StatCard
          label="Decay Spikes"
          value={spikeCount}
          alert={spikeCount > 0 ? 'critical' : undefined}
        />
      </div>

      {/* Status distribution */}
      <StatusDistribution distribution={statusDistribution} />

      {/* Progress + EOC trend side by side */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ClassProgressCard unitMastery={masteryByUnit} />
        <EocReadinessTrendChart points={eocTrend} />
      </div>

      {/* Decay + off-ramp */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DecayAlerts decays={decayRates} />
        <OffRampList rows={offRampStudents} />
      </div>

      {/* Most missed + misconceptions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MostMissedQuestionsTable rows={mostMissed} />
        <MisconceptionsTable rows={misconceptions} />
      </div>

      {/* Small groups */}
      <RecommendedSmallGroups groups={smallGroups} />
    </div>
  )
}
