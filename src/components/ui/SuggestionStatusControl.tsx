'use client'

/**
 * SuggestionStatusControl — triage a single suggestion (ADR 0019).
 *
 * Shared by both read surfaces (/teacher/reports?tab=suggestions and
 * /admin/reports), hence `ui/` rather than a role-specific directory.
 *
 * `allowed` is computed SERVER-side from SUGGESTION_STATUS_TRANSITIONS and passed
 * in, so the transition matrix has exactly one home (src/lib/suggestions/status.ts)
 * and the client can't drift from it.
 *
 * Unlike SuggestionBox (which lives in the nav and must never refresh), this is a
 * page-level table row, so `router.refresh()` on success is correct here.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SuggestionStatus } from '@prisma/client'
import { SUGGESTION_MAX_REVIEWER_NOTE_CHARS } from '@/lib/suggestions/constants'
import { SUGGESTION_STATUS_LABELS } from '@/lib/suggestions/status'

interface SuggestionStatusControlProps {
  suggestionId: string
  status: SuggestionStatus
  /** Legal next statuses, derived server-side from the transition matrix. */
  allowed: SuggestionStatus[]
}

const ERROR_MESSAGES: Record<string, string> = {
  SUB_MODE_READ_ONLY:
    'Substitute mode is on — turn it off in Settings to triage suggestions.',
  INVALID_STATUS_TRANSITION:
    'Someone else already changed this. Reload to see the current status.',
  FORBIDDEN: 'You do not have access to this suggestion.',
  NOT_FOUND: 'This suggestion no longer exists. Reload the page.',
}

function describeError(status: number, code?: string): string {
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code]
  if (status === 403) return 'Not allowed (403).'
  return `Failed (${status}). Please try again.`
}

export function SuggestionStatusControl({
  suggestionId,
  status,
  allowed,
}: SuggestionStatusControlProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)

  async function apply(next: SuggestionStatus) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/suggestions/${suggestionId}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          status: next,
          ...(note.trim() ? { reviewerNote: note.trim() } : {}),
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setError(describeError(res.status, data.error))
        return
      }
      setNote('')
      setNoteOpen(false)
      router.refresh()
    } catch {
      setError('Network problem — please try again.')
    } finally {
      setSaving(false)
    }
  }

  const selectClass = 'rounded-md border border-gray-300 bg-white px-2 py-1 text-xs'

  return (
    <div className="space-y-1">
      <label className="sr-only" htmlFor={`status-${suggestionId}`}>
        Change status for this suggestion
      </label>
      <select
        id={`status-${suggestionId}`}
        className={selectClass}
        disabled={saving || allowed.length === 0}
        value=""
        onChange={(e) => {
          const next = e.target.value as SuggestionStatus
          if (next) void apply(next)
        }}
      >
        <option value="">{saving ? 'Saving…' : 'Change to…'}</option>
        {allowed.map((s) => (
          <option key={s} value={s}>
            {SUGGESTION_STATUS_LABELS[s]}
          </option>
        ))}
      </select>

      {noteOpen ? (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={SUGGESTION_MAX_REVIEWER_NOTE_CHARS}
          rows={2}
          placeholder="Private note (optional)"
          aria-label="Private reviewer note"
          className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
        />
      ) : (
        <button
          type="button"
          onClick={() => setNoteOpen(true)}
          className="text-xs text-gray-500 underline hover:text-gray-700"
        >
          Add note
        </button>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
