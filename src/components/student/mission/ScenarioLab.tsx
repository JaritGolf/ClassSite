'use client'

/**
 * Scenario Lab / Source Quest (spec §10.4 steps 5–6).
 *
 * Renders the lesson's SOURCE_ANALYSIS steps — a primary-source passage
 * (read-aloud + sentence chunking via StimulusDisplay) with guiding
 * questions. "Scenario Complete" unlocks once every guiding question has
 * been attempted.
 */

import { useState } from 'react'
import { parseStepContent } from '@/lib/lesson-content'
import { TrackIcon } from '@/components/ui/TrackIcon'
import { LessonStepRenderer, type LessonStepView } from './LessonStepRenderer'

interface ScenarioLabProps {
  steps: LessonStepView[]
  onComplete: () => void
  /** Teacher preview (ADR 0015): completion never gated by guiding questions. */
  ungated?: boolean
  /** Teacher preview: guiding questions render as static answer keys. */
  revealAnswers?: boolean
}

export function ScenarioLab({ steps, onComplete, ungated, revealAnswers }: ScenarioLabProps) {
  const [attempted, setAttempted] = useState<Set<string>>(new Set())

  // Only steps that actually parse as source-analysis gate completion — a
  // malformed step degrades to text and must never block progression.
  const gatingIds = steps
    .filter((s) => parseStepContent(s.stepType, s.content).kind === 'source-analysis')
    .map((s) => s.id)
  const allAttempted = ungated || gatingIds.every((id) => attempted.has(id))

  function markAttempted(stepId: string) {
    setAttempted((prev) => {
      if (prev.has(stepId)) return prev
      const next = new Set(prev)
      next.add(stepId)
      return next
    })
  }

  return (
    <div className="space-y-4 rounded-2xl border-2 border-sky-200 bg-white p-5 shadow-card">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white">
          <TrackIcon name="search" className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-xl font-bold text-gray-900">Scenario Lab</h2>
          <p className="text-base text-gray-600">
            Time to apply what you learned — read the source like a historian and answer the
            guiding questions.
          </p>
        </div>
      </div>

      {steps.map((step) => (
        <div key={step.id} className="space-y-2">
          <p className="font-display text-base font-bold text-sky-800">{step.title}</p>
          <LessonStepRenderer step={step} onAttempted={markAttempted} revealAnswers={revealAnswers} />
        </div>
      ))}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onComplete}
          disabled={!allAttempted}
          className="rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-5 py-2 font-display text-sm font-bold text-white transition-colors hover:bg-indigo-500 active:translate-y-[3px] active:border-b-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0 disabled:active:border-b-4"
        >
          Scenario Complete
        </button>
        {!allAttempted && (
          <p className="text-sm font-semibold text-amber-700">Answer every guiding question to continue</p>
        )}
      </div>
    </div>
  )
}
