/**
 * Teacher — Benchmarks list page.
 *
 * Sortable table of all benchmarks with class mastery rates.
 * Server component.
 */

import { requireAuth } from '@/lib/auth'
import { getClassMasteryByBenchmark } from '@/lib/class-analytics'
import { EmptyState } from '@/components/teacher/shared/EmptyState'
import Link from 'next/link'

export default async function BenchmarksPage() {
  const session = await requireAuth(['TEACHER'])
  const rows = await getClassMasteryByBenchmark(session.user.userId)

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No benchmark data yet"
        body="Once students start working on benchmarks, mastery rates will appear here."
      />
    )
  }

  // Sort by mastery rate ascending (lowest first = most attention needed)
  const sorted = [...rows].sort((a, b) => a.masteryRatePercent - b.masteryRatePercent)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Benchmarks</h1>
      <p className="text-sm text-gray-500">
        Sorted by class mastery rate (lowest first). Click a benchmark to see detailed analytics.
      </p>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
              <th className="px-4 py-3">Benchmark</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3 text-right">Mastered</th>
              <th className="px-4 py-3 text-right">Rate</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map((row) => (
              <tr key={row.benchmarkId} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-700">
                  {row.benchmarkCode}
                </td>
                <td className="px-4 py-3 text-gray-700">{row.title}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                  {row.masteredCount}/{row.totalStudents}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`inline-block min-w-[3rem] rounded-full px-2 py-0.5 text-center text-xs font-semibold ${
                      row.masteryRatePercent >= 80
                        ? 'bg-green-100 text-green-700'
                        : row.masteryRatePercent >= 50
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {row.masteryRatePercent}%
                  </span>
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
    </div>
  )
}
