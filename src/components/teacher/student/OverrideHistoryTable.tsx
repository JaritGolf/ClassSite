import type { StudentProfileVM } from '@/lib/student-profile'
import { EmptyState } from '@/components/teacher/shared/EmptyState'

interface OverrideHistoryTableProps {
  history: StudentProfileVM['overrideHistory']
}

export function OverrideHistoryTable({ history }: OverrideHistoryTableProps) {
  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Override History</h2>
        <EmptyState title="No overrides yet" body="Teacher overrides will appear here." />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">Override History</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="pb-2 text-left font-medium text-gray-400">Action</th>
              <th className="pb-2 text-left font-medium text-gray-400">Reason</th>
              <th className="pb-2 text-left font-medium text-gray-400">Date</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.id} className="border-b border-gray-50">
                <td className="py-2 pr-2 font-mono text-indigo-600">
                  {row.action.replace(/_/g, ' ')}
                </td>
                <td className="py-2 pr-2 text-gray-600 max-w-xs truncate">{row.reason}</td>
                <td className="py-2 text-gray-400 whitespace-nowrap">
                  {new Date(row.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
