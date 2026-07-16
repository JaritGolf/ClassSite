import type { UnitMasteryRow } from '@/lib/class-analytics'
import { EmptyState } from '@/components/teacher/shared/EmptyState'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

interface ClassProgressCardProps {
  unitMastery: UnitMasteryRow[]
}

export function ClassProgressCard({ unitMastery }: ClassProgressCardProps) {
  if (unitMastery.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <ExplainerHover
        title="Progress by Unit"
        text="How many benchmarks in each unit your class has mastered so far."
        theme="admin"
      >
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Progress by Unit</h2>
      </ExplainerHover>
        <EmptyState title="No units yet" body="Progress will appear once students begin." />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <ExplainerHover
        title="Progress by Unit"
        text="How many benchmarks in each unit your class has mastered so far."
        theme="admin"
      >
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Progress by Unit</h2>
      </ExplainerHover>
      <ul className="space-y-3" role="list">
        {unitMastery.map((row) => (
          <li key={row.unitId}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-gray-700 truncate">{row.title}</span>
              <span className="ml-2 shrink-0 text-gray-400">
                {row.masteredBenchmarkCount}/{row.benchmarkCount} benchmarks
              </span>
            </div>
            <div
              className="relative h-2 w-full rounded-full bg-gray-100 overflow-hidden"
              role="progressbar"
              aria-valuenow={row.progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${row.title}: ${row.progressPercent}%`}
            >
              <div
                className="absolute top-0 left-0 h-full rounded-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${row.progressPercent}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
