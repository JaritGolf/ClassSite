import type { QueueItem } from '@/lib/content-approval'
import { ApprovalQueueRow } from './ApprovalQueueRow'
import { EmptyState } from '@/components/teacher/shared/EmptyState'

interface ApprovalQueueTableProps {
  items: QueueItem[]
}

export function ApprovalQueueTable({ items }: ApprovalQueueTableProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Queue is empty"
        body="No content items match the current filters."
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Content</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Benchmark</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {items.map((item) => (
            <ApprovalQueueRow key={`${item.entityType}-${item.id}`} item={item} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
