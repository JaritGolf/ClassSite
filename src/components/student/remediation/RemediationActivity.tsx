'use client'

/**
 * RemediationActivity
 *
 * Renders an assigned remediation ("Training Mission", spec §14.1): the activity
 * content plus a completion action. On completion the student is offered the
 * alternate reassessment ("Second Chance Challenge") for the benchmark.
 */

import { useState } from 'react'
import Link from 'next/link'

interface RemediationActivityProps {
  studentRemediationId: string
  title: string
  remediationType: string
  content: string
  alreadyComplete: boolean
  /** Mastery Challenge assessment id for the benchmark, if available */
  reassessmentAssessmentId: string | null
}

export function RemediationActivity({
  studentRemediationId,
  title,
  remediationType,
  content,
  alreadyComplete,
  reassessmentAssessmentId,
}: RemediationActivityProps) {
  const [done, setDone] = useState(alreadyComplete)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleComplete() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/remediation/${studentRemediationId}/complete`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Could not mark this complete.')
      }
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not mark this complete.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-amber-600">
          Training Mission · {remediationType.replace(/_/g, ' ').toLowerCase()}
        </p>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      </div>

      <div className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">{content}</div>

      {error && (
        <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!done ? (
        <button
          onClick={handleComplete}
          disabled={submitting}
          className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Saving…' : 'Mark Training Complete'}
        </button>
      ) : (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-medium text-green-700">
            <span>✅</span> Training complete — you&apos;re ready for your Second Chance Challenge.
          </p>
          {reassessmentAssessmentId ? (
            <Link
              href={`/student/assessment/${reassessmentAssessmentId}`}
              className="inline-block rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Take Second Chance Challenge →
            </Link>
          ) : (
            <Link href="/student/map" className="text-sm text-indigo-600 hover:underline">
              Back to Mission Map
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
