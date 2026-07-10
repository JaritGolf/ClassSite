'use client'

/**
 * Renders one lesson step by its parsed content kind (ADR 0013):
 *   text             — plain instructional text (NOTE, VOCABULARY, legacy rows)
 *   worked-example   — problem + progressive "show my thinking" reveal (§18)
 *   interactive-check— ungraded self-check with per-option feedback
 *   source-analysis  — passage via StimulusDisplay (read-aloud + chunking) + guiding questions
 *
 * `onAttempted(stepId)` fires once per step when the student has engaged with
 * every check the step contains — the walkthrough uses it to gate "Next".
 * All interactions are client-local; nothing is persisted (no grading).
 */

import { useState } from 'react'
import { parseStepContent, type CheckOption } from '@/lib/lesson-content'
import { StimulusDisplay } from '@/components/reading-load/StimulusDisplay'

export interface LessonStepView {
  id: string
  stepType: string
  title: string
  content: string
  sequenceOrder: number
  required: boolean
}

interface LessonStepRendererProps {
  step: LessonStepView
  onAttempted?: (stepId: string) => void
}

export function LessonStepRenderer({ step, onAttempted }: LessonStepRendererProps) {
  const parsed = parseStepContent(step.stepType, step.content)

  if (parsed.kind === 'worked-example') {
    return <WorkedExampleView {...parsed} />
  }
  if (parsed.kind === 'interactive-check') {
    return (
      <CheckQuestion
        question={parsed.question}
        options={parsed.options}
        onFirstAttempt={() => onAttempted?.(step.id)}
      />
    )
  }
  if (parsed.kind === 'source-analysis') {
    return (
      <SourceAnalysisView
        stepId={step.id}
        sourceTitle={parsed.sourceTitle}
        sourceAttribution={parsed.sourceAttribution}
        passage={parsed.passage}
        guidingQuestions={parsed.guidingQuestions}
        onAllAttempted={() => onAttempted?.(step.id)}
      />
    )
  }
  return (
    <div className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">{parsed.text}</div>
  )
}

// ── Worked example (§18: problem → think-aloud steps → answer → why) ─────────

function WorkedExampleView({
  problem,
  thinkAloud,
  answer,
  whyItWorks,
}: {
  problem: string
  thinkAloud: string[]
  answer: string
  whyItWorks: string
}) {
  const [revealed, setRevealed] = useState(0)
  const allRevealed = revealed >= thinkAloud.length

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">
          The problem
        </p>
        <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-line">{problem}</p>
      </div>

      {revealed > 0 && (
        <ol className="space-y-2" aria-label="Expert thinking steps">
          {thinkAloud.slice(0, revealed).map((thought, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 h-6 w-6 flex-shrink-0 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed text-gray-700">{thought}</p>
            </li>
          ))}
        </ol>
      )}

      {!allRevealed ? (
        <button
          type="button"
          onClick={() => setRevealed((n) => n + 1)}
          className="rounded-lg border border-indigo-300 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors"
        >
          {revealed === 0 ? 'Show my thinking →' : 'Next thought →'}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border border-green-300 bg-green-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700 mb-1">
              Answer
            </p>
            <p className="text-sm font-semibold text-green-900">{answer}</p>
          </div>
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 mb-1">
              Why this works
            </p>
            <p className="text-sm leading-relaxed text-indigo-900">{whyItWorks}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Ungraded self-check question (client-local; no persistence) ──────────────
// Exported for reuse by RemediationActivity's try-it check.

export function CheckQuestion({
  question,
  options,
  onFirstAttempt,
}: {
  question: string
  options: CheckOption[]
  onFirstAttempt?: () => void
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const [attempted, setAttempted] = useState(false)

  function choose(i: number) {
    setSelected(i)
    if (!attempted) {
      setAttempted(true)
      onFirstAttempt?.()
    }
  }

  const letters = ['A', 'B', 'C', 'D']

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-900 leading-relaxed">{question}</p>
      <div className="space-y-2" role="group" aria-label="Answer choices">
        {options.map((opt, i) => {
          const isSelected = selected === i
          const stateClasses = isSelected
            ? opt.correct
              ? 'border-green-500 bg-green-50'
              : 'border-amber-500 bg-amber-50'
            : 'border-gray-300 bg-white hover:border-indigo-400'
          return (
            <div key={i}>
              <button
                type="button"
                onClick={() => choose(i)}
                aria-pressed={isSelected}
                className={`w-full text-left rounded-lg border px-3 py-2.5 text-sm text-gray-800 transition-colors ${stateClasses}`}
              >
                <span className="font-bold text-gray-500 mr-2">{letters[i] ?? '•'}</span>
                {opt.text}
              </button>
              {isSelected && (
                <p
                  role="status"
                  className={`mt-1 ml-1 text-sm leading-relaxed ${
                    opt.correct ? 'text-green-800' : 'text-amber-800'
                  }`}
                >
                  {opt.correct ? '✓ ' : ''}
                  {opt.feedback}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Source analysis: passage + guiding questions (§10.4 Source Quest) ────────

function SourceAnalysisView({
  stepId,
  sourceTitle,
  sourceAttribution,
  passage,
  guidingQuestions,
  onAllAttempted,
}: {
  stepId: string
  sourceTitle: string
  sourceAttribution: string
  passage: string
  guidingQuestions: { question: string; options: CheckOption[] }[]
  onAllAttempted?: () => void
}) {
  const [attemptedQs, setAttemptedQs] = useState<Set<number>>(new Set())

  // Runs from the option click handler — safe place to notify the parent
  // (never inside a state updater, which React treats as a render-phase update).
  function markAttempted(qi: number) {
    if (attemptedQs.has(qi)) return
    const next = new Set(attemptedQs)
    next.add(qi)
    setAttemptedQs(next)
    if (next.size === guidingQuestions.length) onAllAttempted?.()
  }

  return (
    <div className="space-y-4">
      <StimulusDisplay
        stimulusId={stepId}
        title={sourceTitle}
        content={passage}
        resolvedLevel={2}
        fromVariant={false}
        glossaryAnnotations={[]}
      />
      <p className="text-xs text-gray-600 italic">{sourceAttribution}</p>

      {guidingQuestions.map((gq, qi) => (
        <div key={qi} className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">
            Guiding question {qi + 1} of {guidingQuestions.length}
          </p>
          <CheckQuestion
            question={gq.question}
            options={gq.options}
            onFirstAttempt={() => markAttempted(qi)}
          />
        </div>
      ))}
    </div>
  )
}
