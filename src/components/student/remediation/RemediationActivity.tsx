'use client'

/**
 * RemediationActivity
 *
 * Renders an assigned remediation ("Training Mission", spec §14.1): the activity
 * content plus a completion action. On completion the student is offered the
 * alternate reassessment ("Second Chance Challenge") for the benchmark.
 *
 * Authored content (ADR 0013) is JSON per RemediationContentSchema — rendered
 * as concept + examples/non-examples + optional try-it check. Legacy plain-text
 * rows fall back to the original whitespace-pre-line rendering.
 */

import { useState } from 'react'
import Link from 'next/link'
import { parseRemediationContent } from '@/lib/lesson-content'
import { CheckQuestion } from '@/components/student/mission/LessonStepRenderer'

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

      <RemediationContentView content={content} />

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

/** Structured reteach rendering with plain-text fallback for legacy rows. */
function RemediationContentView({ content }: { content: string }) {
  const parsed = parseRemediationContent(content)
  if (!parsed) {
    return <div className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">{content}</div>
  }

  const examples = parsed.examples.filter((e) => e.isExample)
  const nonExamples = parsed.examples.filter((e) => !e.isExample)

  return (
    <div className="space-y-4">
      <div className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">
        {parsed.concept}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
            ✓ Looks like this
          </p>
          {examples.map((e, i) => (
            <div key={i} className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-sm text-gray-800">{e.text}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-green-800">{e.explanation}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
            ✗ Not this
          </p>
          {nonExamples.map((e, i) => (
            <div key={i} className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-gray-800">{e.text}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-red-800">{e.explanation}</p>
            </div>
          ))}
        </div>
      </div>

      {parsed.tryIt && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 mb-2">
            Try it yourself
          </p>
          <CheckQuestion question={parsed.tryIt.question} options={parsed.tryIt.options} />
        </div>
      )}
    </div>
  )
}
