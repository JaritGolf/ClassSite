/**
 * BenchmarkOverview — header card showing mastery rate, attempt score progression,
 * and remediation count for a benchmark.
 */

import type { BenchmarkOverview } from '@/lib/benchmark-analytics'
import { StatCard } from '@/components/teacher/dashboard/StatCard'
import { TrendChart } from '@/components/teacher/shared/TrendChart'

interface Props {
  overview: BenchmarkOverview
}

export function BenchmarkOverviewCard({ overview }: Props) {
  const chartPoints = overview.averageScoreByAttempt.map((p) => ({
    x: p.attemptNumber,
    y: p.avgScore * 100,
  }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Class Mastery Rate"
          value={`${overview.classMasteryRatePercent}%`}
          alert={
            overview.classMasteryRatePercent >= 80
              ? undefined
              : overview.classMasteryRatePercent >= 50
              ? 'warn'
              : 'critical'
          }
        />
        <StatCard
          label="Students in Remediation"
          value={overview.studentsInRemediationCount}
          alert={overview.studentsInRemediationCount > 0 ? 'warn' : undefined}
        />
        <StatCard
          label="Avg Score (last attempt)"
          value={
            overview.averageScoreByAttempt.length > 0
              ? `${Math.round(
                  overview.averageScoreByAttempt[overview.averageScoreByAttempt.length - 1]
                    .avgScore * 100
                )}%`
              : '—'
          }
        />
      </div>

      {chartPoints.length >= 2 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Average Score by Attempt Number
          </p>
          <TrendChart
            points={chartPoints}
            height={100}
            label="Average score by attempt number"
          />
        </div>
      )}
    </div>
  )
}
