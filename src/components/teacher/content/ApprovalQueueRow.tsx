'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { QueueItem } from '@/lib/content-approval'

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  NEEDS_REVIEW: 'bg-yellow-100 text-yellow-800',
  NEEDS_REVISION: 'bg-orange-100 text-orange-800',
  APPROVED: 'bg-green-100 text-green-800',
  ARCHIVED: 'bg-red-100 text-red-800',
}

interface ApprovalQueueRowProps {
  item: QueueItem
}

export function ApprovalQueueRow({ item }: ApprovalQueueRowProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'archive' | null>(null)

  async function handleApprove() {
    setLoading('approve')
    try {
      await fetch('/api/teacher/content/approve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ entityType: item.entityType, entityId: item.id }),
      })
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  async function handleArchive() {
    const reason = window.prompt('Reason for archiving:')
    if (!reason) return

    setLoading('archive')
    try {
      await fetch('/api/teacher/content/archive', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ entityType: item.entityType, entityId: item.id, reason }),
      })
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 font-mono text-xs text-gray-500">
        {item.entityType.replace('_', ' ')}
      </td>
      <td className="px-4 py-3 max-w-xs truncate">{item.label}</td>
      <td className="px-4 py-3 font-mono text-xs">{item.benchmarkCode ?? '—'}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status] ?? 'bg-gray-100'}`}>
          {item.status.replace('_', ' ')}
        </span>
      </td>
      <td className="px-4 py-3 text-right space-x-2">
        <button
          onClick={handleApprove}
          disabled={loading !== null || item.status === 'APPROVED'}
          className="rounded px-2 py-1 text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading === 'approve' ? '…' : 'Approve'}
        </button>
        <button
          onClick={handleArchive}
          disabled={loading !== null || item.status === 'ARCHIVED'}
          className="rounded px-2 py-1 text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        >
          {loading === 'archive' ? '…' : 'Archive'}
        </button>
      </td>
    </tr>
  )
}
