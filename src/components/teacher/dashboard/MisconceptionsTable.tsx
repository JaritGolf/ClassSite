import type { MisconceptionRow } from '@/lib/class-analytics'
import { EmptyState } from '@/components/teacher/shared/EmptyState'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

interface MisconceptionsTableProps {
  rows: MisconceptionRow[]
}

export function MisconceptionsTable({ rows }: MisconceptionsTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <ExplainerHover
        title="Common Misconceptions"
        text="Wrong answers linked to a known misconception in the Appendix E inventory — not just any wrong answer, but a specific, recognized way of thinking that led to it."
        theme="admin"
      >
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Common Misconceptions</h2>
      </ExplainerHover>
        <EmptyState title="No misconceptions flagged" body="Misconceptions appear when students select distractors linked to Appendix E codes." />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <ExplainerHover
        title="Common Misconceptions"
        text="Wrong answers linked to a known misconception in the Appendix E inventory — not just any wrong answer, but a specific, recognized way of thinking that led to it."
        theme="admin"
      >
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Common Misconceptions</h2>
      </ExplainerHover>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="pb-2 text-left font-medium text-gray-400">Code</th>
              <th className="pb-2 text-left font-medium text-gray-400">Label</th>
              <th className="pb-2 text-right font-medium text-gray-400">Triggers</th>
              <th className="pb-2 text-right font-medium text-gray-400">Students</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.misconceptionId} className="border-b border-gray-50">
                <td className="py-2 pr-2 font-mono text-indigo-600">{row.code}</td>
                <td className="py-2 pr-2 text-gray-600 max-w-xs truncate">{row.label}</td>
                <td className="py-2 pr-2 text-right font-medium text-gray-700">
                  {row.triggerCount}
                </td>
                <td className="py-2 text-right text-gray-400">{row.affectedStudentCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
