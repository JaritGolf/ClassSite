'use client'

/**
 * RetentionRunButton — client control to run an actual retention purge.
 * Requires an explicit confirm; refreshes the page on success.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface RetentionRunButtonProps {
  /** Whether any threshold is configured; the live purge is disabled otherwise. */
  enabled: boolean
}

export function RetentionRunButton({ enabled }: RetentionRunButtonProps) {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function run() {
    if (!confirm('Permanently delete all rows past the configured retention thresholds? This cannot be undone.')) {
      return
    }
    setRunning(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/retention/purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'PURGE_FAILED')
      setMessage(
        `Deleted ${data.auditLogsDeleted} audit logs and ${data.voidedAttemptsDeleted} voided attempts.`
      )
      router.refresh()
    } catch (e) {
      setMessage(`Error: ${e instanceof Error ? e.message : 'unknown'}`)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={!enabled || running}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {running ? 'Running…' : 'Run purge now'}
      </button>
      {message ? <span className="text-sm text-gray-600">{message}</span> : null}
    </div>
  )
}
