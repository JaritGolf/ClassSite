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
import { LessonStepRenderer, type LessonStepView } from './LessonStepRenderer'

interface ScenarioLabProps {
  steps: LessonStepView[]
  onComplete: () => void
}

export function ScenarioLab({ steps, onComplete }: ScenarioLabProps) {
  const [attempted, setAttempted] = useState<Set<string>>(new Set())

  // Only steps that actually parse as source-analysis gate completion — a
  // malformed step degrades to text and must never block progression.
  const gatingIds = steps
    .filter((s) => parseStepContent(s.stepType, s.content).kind === 'source-analysis')
    .map((s) => s.id)
  const allAttempted = gatingIds.every((id) => attempted.has(id))

  function markAttempted(stepId: string) {
    setAttempted((prev) => {
      if (prev.has(stepId)) return prev
      const next = new Set(prev)
      next.add(stepId)
      return next
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Scenario Lab</h2>
        <p className="text-sm text-gray-600">
          Time to apply what you learned — read the source like a historian and answer the
          guiding questions.
        </p>
      </div>

      {steps.map((step) => (
        <div key={step.id} className="space-y-2">
          <p className="text-sm font-semibold text-indigo-700">{step.title}</p>
          <LessonStepRenderer step={step} onAttempted={markAttempted} />
        </div>
      ))}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onComplete}
          disabled={!allAttempted}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Scenario Complete
        </button>
        {!allAttempted && (
          <p className="text-xs text-amber-700">Answer every guiding question to continue</p>
        )}
      </div>
    </div>
  )
}
