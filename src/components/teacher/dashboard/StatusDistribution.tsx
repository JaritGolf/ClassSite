import type { ClassStatusDistribution } from '@/lib/class-analytics'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

interface StatusDistributionProps {
  distribution: ClassStatusDistribution
}

const STATUS_CONFIG = [
  { key: 'mastered', label: 'Mastered', color: 'bg-green-500' },
  { key: 'readyForMastery', label: 'Ready', color: 'bg-indigo-400' },
  { key: 'inProgress', label: 'In Progress', color: 'bg-blue-400' },
  { key: 'remediationComplete', label: 'Remed. Complete', color: 'bg-teal-400' },
  { key: 'needsRemediation', label: 'Needs Remed.', color: 'bg-yellow-400' },
  { key: 'exposureComplete', label: 'Exposure', color: 'bg-purple-400' },
  { key: 'notStarted', label: 'Not Started', color: 'bg-gray-200' },
  { key: 'teacherOverride', label: 'Override', color: 'bg-pink-300' },
  { key: 'interventionRequired', label: 'Intervention', color: 'bg-red-400' },
] as const

export function StatusDistribution({ distribution }: StatusDistributionProps) {
  const total = Object.values(distribution).reduce((s, n) => s + n, 0)

  if (total === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <ExplainerHover
        title="Status Distribution"
        text="How your roster's progress is spread across mastery statuses right now, at a glance."
        theme="admin"
      >
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Status Distribution</h2>
      </ExplainerHover>
        <p className="text-sm text-gray-400">No student progress data yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <ExplainerHover
        title="Status Distribution"
        text="How your roster's progress is spread across mastery statuses right now, at a glance."
        theme="admin"
      >
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Status Distribution</h2>
      </ExplainerHover>
      {/* Stacked bar */}
      <div
        className="flex h-6 w-full rounded-lg overflow-hidden"
        role="img"
        aria-label="Status distribution bar chart"
      >
        {STATUS_CONFIG.map((s) => {
          const count = distribution[s.key as keyof ClassStatusDistribution]
          if (count === 0) return null
          const pct = (count / total) * 100
          return (
            <div
              key={s.key}
              className={`${s.color} flex items-center justify-center`}
              style={{ width: `${pct}%` }}
              title={`${s.label}: ${count}`}
            >
              {pct > 5 && (
                <span className="text-[9px] font-bold text-white drop-shadow-sm">
                  {count}
                </span>
              )}
            </div>
          )
        })}
      </div>
      {/* Legend */}
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5" role="list" aria-label="Status legend">
        {STATUS_CONFIG.map((s) => {
          const count = distribution[s.key as keyof ClassStatusDistribution]
          if (count === 0) return null
          return (
            <li key={s.key} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className={`inline-block h-2.5 w-2.5 rounded-sm ${s.color}`} aria-hidden="true" />
              {s.label}: <strong>{count}</strong>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
