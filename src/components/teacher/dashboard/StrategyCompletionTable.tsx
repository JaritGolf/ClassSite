import Link from 'next/link'
import type { StrategyCompletionRow } from '@/lib/class-analytics'
import { EmptyState } from '@/components/teacher/shared/EmptyState'

interface Props {
  rows: StrategyCompletionRow[]
}

/**
 * Roster view of Test-Taking Strategy completion. Shows each student's total
 * apply-it uses and how many strategies meet their required count. Sorted by
 * who owes the most (from the analytics function).
 */
export function StrategyCompletionTable({ rows }: Props) {
  const anyRequired = rows.some((r) => r.missionsRequired > 0)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-gray-700">Strategist Track</h2>
      </div>
      <p className="mb-3 text-xs text-gray-500">
        {anyRequired
          ? 'Correct apply-it rounds ("uses") per student vs. the required count.'
          : 'No requirement set. Set “Strategy uses required” in a class’s settings to hold students to a target.'}
      </p>
      {rows.length === 0 ? (
        <EmptyState
          title="No students yet"
          body="Strategy usage will appear here once students practice the Strategist missions."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-2 text-left font-medium text-gray-400">Student</th>
                <th className="pb-2 text-right font-medium text-gray-400">Total uses</th>
                <th className="pb-2 text-right font-medium text-gray-400">Strategies met</th>
                <th className="pb-2 text-right font-medium text-gray-400">Owed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.studentId} className="border-b border-gray-50">
                  <td className="py-2 pr-2 text-gray-700">
                    <Link
                      href={`/teacher/students/${r.studentId}`}
                      className="hover:text-indigo-600 hover:underline"
                    >
                      {r.displayName}
                    </Link>
                  </td>
                  <td className="py-2 pr-2 text-right font-medium text-gray-700">
                    {r.totalUses}
                  </td>
                  <td className="py-2 pr-2 text-right text-gray-600">
                    {r.missionsRequired > 0
                      ? `${r.missionsMet} / ${r.missionsRequired}`
                      : '—'}
                  </td>
                  <td className="py-2 text-right">
                    {r.owed > 0 ? (
                      <span className="font-semibold text-amber-600">{r.owed}</span>
                    ) : (
                      <span className="text-green-600">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
