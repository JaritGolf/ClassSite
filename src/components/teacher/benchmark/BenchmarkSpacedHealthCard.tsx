/**
 * BenchmarkSpacedHealthCard — summary of spaced-retrieval health for a benchmark.
 */

import type { BenchmarkSpacedHealth } from '@/lib/benchmark-analytics'
import { StatCard } from '@/components/teacher/dashboard/StatCard'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

interface Props {
  health: BenchmarkSpacedHealth
}

export function BenchmarkSpacedHealthCard({ health }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <ExplainerHover
        title="Spaced Retrieval Health"
        text="How this benchmark is holding up in students' Daily Drill — how many are tracking it, how many are forgetting it, and how often it's due."
        theme="admin"
      >
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Spaced Retrieval Health
        </h3>
      </ExplainerHover>
      {health.totalStudents === 0 ? (
        <p className="text-xs text-gray-400">
          No spaced-review data yet for this benchmark.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Students tracked"
            value={health.totalStudents}
            explain="Students with an active spaced-review schedule for this benchmark."
          />
          <StatCard
            label="Decaying"
            value={`${health.decayRatePercent}%`}
            subtext={`${health.decayingStudents} of ${health.totalStudents}`}
            alert={health.decayRatePercent >= 50 ? 'critical' : health.decayRatePercent >= 25 ? 'warn' : undefined}
            explain="Students whose most recent review answer scored below quality 3."
          />
          <StatCard
            label="Avg interval"
            value={`${health.avgIntervalDays}d`}
            explain="The average number of days between reviews across tracked students — longer means the schedule trusts their memory more."
          />
          <StatCard
            label="Due now"
            value={health.itemsDueNow}
            alert={health.itemsDueNow > 0 ? 'info' : undefined}
            explain="How many students have this benchmark due for review right now."
          />
        </div>
      )}
    </div>
  )
}
