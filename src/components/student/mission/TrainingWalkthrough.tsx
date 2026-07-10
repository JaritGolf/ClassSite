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
}

export function TrainingWalkthrough({
  steps,
  onComplete,
  glossaryTerms,
  initialIndex = 0,
  onIndexChange,
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
  const mayAdvance = step ? canAdvance(step, attempted) : true

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
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Guided Training</h2>
          <p className="text-sm font-semibold text-indigo-700">{step.title}</p>
        </div>
        <span className="flex-shrink-0 text-xs font-medium text-gray-600 rounded-full bg-gray-100 px-2.5 py-1">
          Step {index + 1} of {steps.length}
        </span>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {steps.map((s, i) => (
          <span
            key={s.id}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? 'w-6 bg-indigo-600' : i < index ? 'w-3 bg-indigo-300' : 'w-3 bg-gray-200'
            }`}
          />
        ))}
      </div>

      <LessonStepRenderer
        key={step.id}
        step={step}
        onAttempted={markAttempted}
        glossaryTerms={glossaryTerms}
      />

      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Back
        </button>

        <div className="flex items-center gap-3">
          {!mayAdvance && stepNeedsAttempt(step) && (
            <p className="text-xs text-amber-700">Try the quick check to continue</p>
          )}
          {isLast ? (
            <button
              type="button"
              onClick={onComplete}
              disabled={!mayAdvance}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Training Complete
            </button>
          ) : (
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              disabled={!mayAdvance}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
