/**
 * SpikeAlerts — prominent alert section for benchmarks with decay spikes (≥ 50%).
 */

import type { ClassDecayRate } from '@/lib/spaced-retrieval/decay'
import { AlertBadge } from '@/components/teacher/shared/AlertBadge'
import { ExplainerHover } from '@/components/ui/ExplainerHover'
import Link from 'next/link'

interface Props {
  spikes: ClassDecayRate[]
}

export function SpikeAlerts({ spikes }: Props) {
  return (
    <div
      className="rounded-xl border border-red-200 bg-red-50 p-4"
      role="alert"
      aria-label={`${spikes.length} decay spike${spikes.length !== 1 ? 's' : ''} detected`}
    >
      <div className="flex items-center gap-2 mb-3">
        <AlertBadge tone="critical">
          {spikes.length} decay spike{spikes.length !== 1 ? 's' : ''} detected
        </AlertBadge>
        <ExplainerHover
          title="Decay Spike"
          text="A spike means 50%+ of the class scored below quality 3 on their most recent spaced-review answer for this benchmark — worth a Re-prime or a quick class refresher."
          theme="admin"
        >
          <span className="text-xs text-red-600">
            50%+ of class is forgetting these benchmarks
          </span>
        </ExplainerHover>
      </div>
      <ul className="space-y-2" role="list">
        {spikes.map((spike) => (
          <li
            key={spike.benchmarkId}
            className="flex items-center justify-between rounded-lg bg-white px-4 py-2 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-semibold text-red-700">
                {spike.benchmarkCode}
              </span>
              <span className="text-xs text-gray-500">
                {spike.decayingStudents}/{spike.totalStudents} students ({spike.decayRatePercent}%)
              </span>
            </div>
            <Link
              href={`/teacher/benchmarks/${spike.benchmarkId}`}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              View benchmark &rarr;
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
