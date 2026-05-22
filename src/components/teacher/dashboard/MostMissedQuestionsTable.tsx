import type { MissedQuestionRow } from '@/lib/class-analytics'
import { EmptyState } from '@/components/teacher/shared/EmptyState'

interface MostMissedQuestionsTableProps {
  rows: MissedQuestionRow[]
}

export function MostMissedQuestionsTable({ rows }: MostMissedQuestionsTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Most Missed Questions</h2>
        <EmptyState title="No data yet" body="Missed questions will appear after students attempt assessments." />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">Most Missed Questions</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="pb-2 text-left font-medium text-gray-400">Benchmark</th>
              <th className="pb-2 text-left font-medium text-gray-400">Question Preview</th>
              <th className="pb-2 text-right font-medium text-gray-400">Miss Rate</th>
              <th className="pb-2 text-right font-medium text-gray-400">Attempts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.questionId} className="border-b border-gray-50">
                <td className="py-2 pr-2 font-mono text-indigo-600">{row.benchmarkCode}</td>
                <td className="py-2 pr-2 text-gray-600 max-w-xs truncate">
                  {row.promptPreview}
                </td>
                <td className="py-2 pr-2 text-right">
                  <span
                    className={
                      row.missRatePercent >= 60
                        ? 'font-semibold text-red-600'
                        : row.missRatePercent >= 40
                        ? 'font-medium text-yellow-600'
                        : 'text-gray-600'
                    }
                  >
                    {row.missRatePercent}%
                  </span>
                </td>
                <td className="py-2 text-right text-gray-400">{row.totalAttempts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
