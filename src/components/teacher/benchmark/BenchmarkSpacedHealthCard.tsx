/**
 * BenchmarkSpacedHealthCard — summary of spaced-retrieval health for a benchmark.
 */

import type { BenchmarkSpacedHealth } from '@/lib/benchmark-analytics'
import { StatCard } from '@/components/teacher/dashboard/StatCard'

interface Props {
  health: BenchmarkSpacedHealth
}

export function BenchmarkSpacedHealthCard({ health }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Spaced Retrieval Health
      </h3>
      {health.totalStudents === 0 ? (
        <p className="text-xs text-gray-400">
          No spaced-review data yet for this benchmark.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Students tracked"
            value={health.totalStudents}
          />
          <StatCard
            label="Decaying"
            value={`${health.decayRatePercent}%`}
            subtext={`${health.decayingStudents} of ${health.totalStudents}`}
            alert={health.decayRatePercent >= 50 ? 'critical' : health.decayRatePercent >= 25 ? 'warn' : undefined}
          />
          <StatCard
            label="Avg interval"
            value={`${health.avgIntervalDays}d`}
          />
          <StatCard
            label="Due now"
            value={health.itemsDueNow}
            alert={health.itemsDueNow > 0 ? 'info' : undefined}
          />
        </div>
      )}
    </div>
  )
}
