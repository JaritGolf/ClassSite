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
import { NextStepHandoff } from '@/components/student/NextStepHandoff'
import { Mascot } from '@/components/ui/Mascot'
import { TrackIcon } from '@/components/ui/TrackIcon'

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
    <div className="space-y-4 rounded-2xl border-2 border-amber-200 bg-white p-6 shadow-card">
      <div className="flex items-start gap-3">
        <span className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-400 text-amber-950">
          <TrackIcon name="target" className="h-5 w-5" />
        </span>
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-widest text-amber-700">
            Training Mission · {remediationType.replace(/_/g, ' ').toLowerCase()}
          </p>
          <h2 className="font-display text-xl font-bold text-gray-900">{title}</h2>
        </div>
      </div>

      <RemediationContentView content={content} />

      {error && (
        <p className="rounded-xl border-2 border-red-200 bg-red-50 px-3 py-2 text-base text-red-700">
          {error}
        </p>
      )}

      {!done ? (
        <button
          onClick={handleComplete}
          disabled={submitting}
          className="rounded-2xl border-b-4 border-amber-700 bg-amber-500 px-5 py-2 font-display text-sm font-bold text-amber-950 transition-colors hover:bg-amber-400 active:translate-y-[3px] active:border-b-0 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Mark Training Complete'}
        </button>
      ) : (
        <div className="space-y-3 animate-pop-in">
          <div className="flex items-center gap-3">
            <Mascot pose="happy" className="h-12 w-12 flex-shrink-0" />
            <p className="text-base font-bold text-green-700">
              Training complete — you&apos;re ready for your Second Chance Challenge.
            </p>
          </div>
          {reassessmentAssessmentId ? (
            <Link
              href={`/student/assessment/${reassessmentAssessmentId}`}
              className="inline-block rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-5 py-2 font-display text-sm font-bold text-white transition-colors hover:bg-indigo-500 active:translate-y-[3px] active:border-b-0"
            >
              Take Second Chance Challenge →
            </Link>
          ) : (
            // No reassessment authored for this benchmark. This branch used to
            // read "Back to Mission Map", which left a student who had just
            // finished assigned work with nothing to do.
            <NextStepHandoff heading="Your next step" secondary="map" />
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
      <div className="max-w-prose whitespace-pre-line text-base leading-7 text-gray-800">
        {parsed.concept}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="font-display text-xs font-bold uppercase tracking-widest text-green-700">
            ✓ Looks like this
          </p>
          {examples.map((e, i) => (
            <div key={i} className="rounded-2xl border-2 border-green-200 bg-green-50 p-3.5">
              <p className="text-base text-gray-800">{e.text}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-green-800">{e.explanation}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <p className="font-display text-xs font-bold uppercase tracking-widest text-red-700">
            ✗ Not this
          </p>
          {nonExamples.map((e, i) => (
            <div key={i} className="rounded-2xl border-2 border-red-200 bg-red-50 p-3.5">
              <p className="text-base text-gray-800">{e.text}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-red-800">{e.explanation}</p>
            </div>
          ))}
        </div>
      </div>

      {parsed.tryIt && (
        <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4">
          <p className="mb-2 font-display text-xs font-bold uppercase tracking-widest text-indigo-700">
            Try it yourself
          </p>
          <CheckQuestion question={parsed.tryIt.question} options={parsed.tryIt.options} />
        </div>
      )}
    </div>
  )
}
