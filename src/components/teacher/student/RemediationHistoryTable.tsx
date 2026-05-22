import type { StudentProfileVM } from '@/lib/student-profile'
import { EmptyState } from '@/components/teacher/shared/EmptyState'

interface RemediationHistoryTableProps {
  history: StudentProfileVM['remediationHistory']
}

const STATUS_BADGE: Record<string, string> = {
  ASSIGNED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  SKIPPED: 'bg-gray-100 text-gray-500',
}

export function RemediationHistoryTable({ history }: RemediationHistoryTableProps) {
  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Remediation History</h2>
        <EmptyState title="No remediations yet" body="Remediation assignments will appear here." />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">Remediation History</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="pb-2 text-left font-medium text-gray-400">Benchmark</th>
              <th className="pb-2 text-left font-medium text-gray-400">Status</th>
              <th className="pb-2 text-left font-medium text-gray-400">Assigned</th>
              <th className="pb-2 text-left font-medium text-gray-400">Completed</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.id} className="border-b border-gray-50">
                <td className="py-2 pr-2 font-mono text-indigo-600">{row.benchmarkCode}</td>
                <td className="py-2 pr-2">
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${STATUS_BADGE[row.status] ?? 'bg-gray-100 text-gray-500'}`}
                  >
                    {row.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="py-2 pr-2 text-gray-400">
                  {new Date(row.assignedAt).toLocaleDateString()}
                </td>
                <td className="py-2 text-gray-400">
                  {row.completedAt
                    ? new Date(row.completedAt).toLocaleDateString()
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
