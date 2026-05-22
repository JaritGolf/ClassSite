'use client'

import { useState } from 'react'
import type { BulkApproveCriteria } from '@/lib/content-approval'

interface BulkApproveConfirmDialogProps {
  criteria: BulkApproveCriteria
  onClose: () => void
  onSuccess: () => void
}

export function BulkApproveConfirmDialog({
  criteria,
  onClose,
  onSuccess,
}: BulkApproveConfirmDialogProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ approvedCount: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/teacher/content/bulk-approve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(criteria),
      })

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Request failed')
        return
      }

      const data = await res.json() as { approvedCount: number }
      setResult(data)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="rounded-lg bg-white p-6 shadow-xl w-full max-w-md">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Confirm Bulk Approve</h2>

        {result ? (
          <div className="space-y-4">
            <p className="text-green-700 font-medium">
              ✓ {result.approvedCount} item{result.approvedCount !== 1 ? 's' : ''} approved.
            </p>
            <button
              onClick={onSuccess}
              className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
              This will approve all{' '}
              <strong>{criteria.entityType.replace('_', ' ')}</strong> items
              {criteria.benchmarkId ? ` in benchmark ${criteria.benchmarkId}` : ' matching the selected filters'}.
              This action writes an audit log entry.
            </div>

            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                disabled={loading}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Approving…' : 'Approve All'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
