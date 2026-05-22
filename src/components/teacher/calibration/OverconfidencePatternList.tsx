/**
 * OverconfidencePatternList — table of students with high overconfidence gap.
 */

import type { OverconfidenceRow } from '@/lib/calibration-analytics'
import { AlertBadge } from '@/components/teacher/shared/AlertBadge'
import Link from 'next/link'

interface Props {
  rows: OverconfidenceRow[]
}

export function OverconfidencePatternList({ rows }: Props) {
  const sorted = [...rows].sort((a, b) => b.gap - a.gap)

  return (
    <div className="rounded-xl border border-yellow-100 bg-white overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
            <th className="px-4 py-3">Student</th>
            <th className="px-4 py-3 text-right">Confidence Gap</th>
            <th className="px-4 py-3 text-right">Sample Size</th>
            <th className="px-4 py-3">Severity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sorted.map((row) => (
            <tr key={row.studentId} className="hover:bg-yellow-50">
              <td className="px-4 py-3">
                <Link
                  href={`/teacher/students/${row.studentId}`}
                  className="font-medium text-gray-900 hover:text-indigo-600"
                >
                  {row.displayName}
                </Link>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                <span
                  className={`font-semibold ${
                    row.gap >= 0.5 ? 'text-red-700' : 'text-yellow-700'
                  }`}
                >
                  {Math.round(row.gap * 100)}%
                </span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                {row.sampleSize}
              </td>
              <td className="px-4 py-3">
                <AlertBadge tone={row.gap >= 0.5 ? 'critical' : 'warn'}>
                  {row.gap >= 0.5 ? 'High' : 'Moderate'}
                </AlertBadge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
