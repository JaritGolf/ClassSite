import type { ClassDecayRate } from '@/lib/spaced-retrieval/decay'
import { AlertBadge } from '@/components/teacher/shared/AlertBadge'

interface DecayAlertsProps {
  decays: ClassDecayRate[]
}

export function DecayAlerts({ decays }: DecayAlertsProps) {
  const spikes = decays.filter((d) => d.spikeAlert)

  if (spikes.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Decay Alerts</h2>
          <AlertBadge tone="info">All clear</AlertBadge>
        </div>
        <p className="text-xs text-gray-400">No benchmarks currently showing class-wide decay spikes.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-red-100 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Decay Alerts</h2>
        <AlertBadge tone="critical">{spikes.length} spike{spikes.length !== 1 ? 's' : ''}</AlertBadge>
      </div>
      <ul className="space-y-2" role="list">
        {spikes.map((d) => (
          <li key={d.benchmarkId} className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-xs">
            <span className="font-mono font-medium text-red-700">{d.benchmarkCode}</span>
            <span className="text-red-600">
              {d.decayingStudents}/{d.totalStudents} students ({d.decayRatePercent}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
