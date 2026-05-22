/**
 * ClassDecayTable — full table of decay rates per benchmark for the class.
 */

import type { ClassDecayRate } from '@/lib/spaced-retrieval/decay'
import { AlertBadge } from '@/components/teacher/shared/AlertBadge'
import Link from 'next/link'

interface Props {
  decayRates: ClassDecayRate[]
}

export function ClassDecayTable({ decayRates }: Props) {
  // Sort: spikes first, then by decay rate descending
  const sorted = [...decayRates].sort((a, b) => {
    if (a.spikeAlert && !b.spikeAlert) return -1
    if (!a.spikeAlert && b.spikeAlert) return 1
    return b.decayRatePercent - a.decayRatePercent
  })

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
            <th className="px-4 py-3">Benchmark</th>
            <th className="px-4 py-3 text-right">Decaying</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3 text-right">Rate</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sorted.map((row) => (
            <tr
              key={row.benchmarkId}
              className={row.spikeAlert ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}
            >
              <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">
                {row.benchmarkCode}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                {row.decayingStudents}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                {row.totalStudents}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                <span
                  className={`font-semibold ${
                    row.decayRatePercent >= 50
                      ? 'text-red-700'
                      : row.decayRatePercent >= 25
                      ? 'text-yellow-700'
                      : 'text-green-700'
                  }`}
                >
                  {row.decayRatePercent}%
                </span>
              </td>
              <td className="px-4 py-3">
                {row.spikeAlert ? (
                  <AlertBadge tone="critical">Spike</AlertBadge>
                ) : row.decayRatePercent >= 25 ? (
                  <AlertBadge tone="warn">Watch</AlertBadge>
                ) : (
                  <AlertBadge tone="info">OK</AlertBadge>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/teacher/benchmarks/${row.benchmarkId}`}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  View &rarr;
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
