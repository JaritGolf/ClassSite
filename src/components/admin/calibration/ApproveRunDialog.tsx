'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ApproveRunDialogProps {
  runId: string
  schoolYear: string
}

export function ApproveRunDialog({ runId, schoolYear }: ApproveRunDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApprove = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for approval.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/calibration/${runId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.message ?? data.error ?? 'Approval failed.')
        return
      }
      setOpen(false)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        Approve &amp; Record ({schoolYear})
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <dialog
            open
            className="rounded-xl bg-white p-6 shadow-xl w-full max-w-md"
            onClose={() => setOpen(false)}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Approve Calibration Run</h2>
            <p className="text-sm text-gray-600 mb-4">
              Approving records these weight changes in the database. The running
              application will not change — Phase 13 work reads approved runs at startup.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for approval
            </label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. 2025-2026 EOC results reviewed; RC correlations align with observed student outcomes."
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={loading}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Approving…' : 'Approve'}
              </button>
            </div>
          </dialog>
        </div>
      )}
    </>
  )
}
