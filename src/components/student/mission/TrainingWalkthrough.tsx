'use client'

/**
 * Guided Training walkthrough (spec §10.4 step 4).
 *
 * Paginates the lesson's training steps (notes, worked examples, interactive
 * checks) with Prev/Next. A required interactive check gates "Next" until the
 * student attempts it (pure gating logic in src/lib/lesson-content/gating.ts).
 * "Training Complete" appears only on the final step.
 */

import { useState } from 'react'
import { canAdvance, stepNeedsAttempt } from '@/lib/lesson-content'
import type { GlossaryTerm } from '@/lib/reading-load'
import { LessonStepRenderer, type LessonStepView } from './LessonStepRenderer'

interface TrainingWalkthroughProps {
  steps: LessonStepView[]
  onComplete: () => void
  /** Glossary popover terms for note text (tier-2 verbs + tier-3 civics terms). */
  glossaryTerms?: GlossaryTerm[]
  /** Resume position (spec §21.3). */
  initialIndex?: number
  /** Reports position changes so the flow can persist the resume point. */
  onIndexChange?: (index: number, stepId: string) => void
  /** Teacher preview (ADR 0015): Next is never gated by required checks. */
  ungated?: boolean
  /** Teacher preview: checks/worked examples render as static answer keys. */
  revealAnswers?: boolean
}

export function TrainingWalkthrough({
  steps,
  onComplete,
  glossaryTerms,
  initialIndex = 0,
  onIndexChange,
  ungated,
  revealAnswers,
}: TrainingWalkthroughProps) {
  const [index, setIndex] = useState(() =>
    Math.min(Math.max(0, initialIndex), Math.max(0, steps.length - 1))
  )
  const [attempted, setAttempted] = useState<Set<string>>(new Set())

  function goTo(nextIndex: number) {
    const clamped = Math.min(Math.max(0, nextIndex), steps.length - 1)
    setIndex(clamped)
    onIndexChange?.(clamped, steps[clamped].id)
  }

  const step = steps[index]
  const isLast = index === steps.length - 1
  const mayAdvance = ungated || (step ? canAdvance(step, attempted) : true)

  function markAttempted(stepId: string) {
    setAttempted((prev) => {
      if (prev.has(stepId)) return prev
      const next = new Set(prev)
      next.add(stepId)
      return next
    })
  }

  if (!step) return null

  return (
    <div className="space-y-4 rounded-2xl border-2 border-indigo-100 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-gray-900">Guided Training</h2>
          <p className="text-sm font-bold text-indigo-700">{step.title}</p>
        </div>
        <span className="flex-shrink-0 rounded-full bg-indigo-100 px-3 py-1 font-display text-xs font-bold text-indigo-800">
          Step {index + 1} of {steps.length}
        </span>
      </div>

      {/* Quest progress bar */}
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-indigo-100"
        role="progressbar"
        aria-label="Training progress"
        aria-valuenow={index + 1}
        aria-valuemin={1}
        aria-valuemax={steps.length}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
          style={{ width: `${((index + 1) / steps.length) * 100}%` }}
        />
      </div>

      <LessonStepRenderer
        key={step.id}
        step={step}
        onAttempted={markAttempted}
        glossaryTerms={glossaryTerms}
        revealAnswers={revealAnswers}
      />

      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="rounded-2xl border-2 border-b-4 border-gray-200 bg-white px-4 py-2 font-display text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 active:translate-y-[2px] active:border-b-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0 disabled:active:border-b-4"
        >
          ← Back
        </button>

        <div className="flex items-center gap-3">
          {!mayAdvance && !ungated && stepNeedsAttempt(step) && (
            <p className="text-sm font-semibold text-amber-700">Try the quick check to continue</p>
          )}
          {isLast ? (
            <button
              type="button"
              onClick={onComplete}
              disabled={!mayAdvance}
              className="rounded-2xl border-b-4 border-green-800 bg-green-600 px-5 py-2 font-display text-sm font-bold text-white transition-colors hover:bg-green-500 active:translate-y-[3px] active:border-b-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0 disabled:active:border-b-4"
            >
              Training Complete ✓
            </button>
          ) : (
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              disabled={!mayAdvance}
              className="rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-5 py-2 font-display text-sm font-bold text-white transition-colors hover:bg-indigo-500 active:translate-y-[3px] active:border-b-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0 disabled:active:border-b-4"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
