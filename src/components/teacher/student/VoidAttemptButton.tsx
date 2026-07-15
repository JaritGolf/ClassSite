'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  attemptId: string
}

/**
 * Voids (resets) a single assessment attempt. Void-in-place: the attempt is
 * kept for audit but no longer counts toward mastery/analytics. Requires a
 * reason. Wired to POST /api/teacher/attempts/[id]/reset.
 */
export function VoidAttemptButton({ attemptId }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleVoid() {
    const reason = window.prompt('Reason for voiding this attempt (recorded in the audit log):')
    if (!reason) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/teacher/attempts/${attemptId}/reset`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setError(
          data.error === 'SUB_MODE_READ_ONLY'
            ? 'Substitute mode is on.'
            : `Failed (${res.status}).`
        )
        return
      }
      router.refresh()
    } catch {
      setError('Network error.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        onClick={handleVoid}
        disabled={busy}
        className="rounded border border-red-200 px-2 py-0.5 text-[11px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        {busy ? '…' : 'Void'}
      </button>
      {error && (
        <span role="alert" className="ml-1 text-[10px] text-red-600">
          {error}
        </span>
      )}
    </>
  )
}
