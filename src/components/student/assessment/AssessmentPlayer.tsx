'use client'

import { useState, useEffect } from 'react'
import { buildAssessmentSubmitBody, type ConfidenceValue } from '@/lib/assessment/wire'
import { ConfidenceSelector } from './ConfidenceSelector'
import { StimulusDisplay } from '@/components/reading-load/StimulusDisplay'
import { Mascot } from '@/components/ui/Mascot'
import type { GlossaryAnnotation } from '@/lib/reading-load'

interface Option {
  id: string
  optionText: string
  position: number
}

interface StimulusData {
  stimulusId: string
  stimulusTitle: string
  resolvedContent: string
  resolvedLevel: number
  fromVariant: boolean
  glossaryAnnotations: GlossaryAnnotation[]
}

interface Question {
  questionId: string
  prompt: string
  itemType: string
  stimulus?: StimulusData | null
  options: Option[]
}

interface AssessmentMeta {
  assessmentId: string
  title: string
  assessmentType: string
  masteryThreshold: number
  questions: Question[]
}

interface ConfidenceTally {
  correct: number
  incorrect: number
}
interface CalibrationSummary {
  high: ConfidenceTally
  medium: ConfidenceTally
  low: ConfidenceTally
}

interface AssessmentPlayerProps {
  assessmentId: string
  /**
   * When provided, the player is embedded in another flow (e.g. the mission
   * pre-check / readiness step): it calls onComplete with the result instead of
   * rendering the standalone "Mission Map" call-to-action. reviewTopics is
   * populated on failed readiness checks (topic labels of missed questions).
   */
  onComplete?: (result: {
    passed: boolean
    score: number
    reviewTopics?: string[] | null
    /** True when the assessment had no questions and was skipped, not taken. */
    skipped?: boolean
  }) => void
}

const CONFIDENCE_REQUIRED = new Set(['MASTERY_CHALLENGE', 'REPUBLIC_CHALLENGE', 'FINAL_TRIAL'])

const CONFETTI_COLORS = ['#f59e0b', '#22c55e', '#0ea5e9', '#f43f5e', '#a855f7', '#4f46e5']

/** CSS-only celebration burst (frozen automatically under reduce-motion). */
function ConfettiBurst() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 28 }).map((_, i) => (
        <span
          key={i}
          className="absolute top-0 block animate-confetti-fall rounded-sm"
          style={{
            left: `${(i * 37 + 11) % 100}%`,
            width: `${7 + (i % 3) * 3}px`,
            height: `${11 + (i % 4) * 2}px`,
            backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animationDelay: `${(i % 12) * 130}ms`,
          }}
        />
      ))}
    </div>
  )
}

export function AssessmentPlayer({ assessmentId, onComplete }: AssessmentPlayerProps) {
  const [meta, setMeta] = useState<AssessmentMeta | null>(null)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, { optionId: string; confidence: ConfidenceValue | null }>>({})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<{
    passed: boolean
    score: number
    feedback?: unknown[]
    calibration?: CalibrationSummary | null
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/assessment/${assessmentId}`)
        if (!res.ok) throw new Error('Failed to load assessment')
        const data: AssessmentMeta = await res.json()
        setMeta(data)

        const startRes = await fetch(`/api/assessment/${assessmentId}/start`, { method: 'POST' })
        if (!startRes.ok) {
          const body = await startRes.json().catch(() => null)
          throw new Error(
            body?.code === 'READINESS_REQUIRED'
              ? 'Pass the Training Check first — it unlocks this Mastery Challenge.'
              : 'Failed to start attempt'
          )
        }
        const { attemptId: id } = await startRes.json()
        setAttemptId(id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [assessmentId])

  if (loading) return <div className="py-12 text-center text-base text-gray-600">Loading assessment…</div>
  if (error) return <div className="py-12 text-center text-base font-semibold text-red-600">{error}</div>
  if (!meta || !attemptId) return null

  const needsConfidence = CONFIDENCE_REQUIRED.has(meta.assessmentType)
  const questions = meta.questions

  // Content-authoring gap guard: an assessment with zero questions must not
  // crash the player or softlock a gated step — offer a way through instead.
  if (questions.length === 0 && !submitted) {
    return (
      <div className="space-y-4 rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 text-center">
        <Mascot pose="thinking" className="mx-auto h-20 w-20" />
        <p className="text-base font-semibold text-amber-900">
          This check has no questions yet — nothing to answer here.
        </p>
        {onComplete ? (
          <button
            onClick={() => onComplete({ passed: false, score: 0, skipped: true })}
            className="rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-6 py-2.5 font-display text-base font-bold text-white transition-colors hover:bg-indigo-500 active:translate-y-[3px] active:border-b-0"
          >
            Continue →
          </button>
        ) : (
          <a
            href="/student/map"
            className="inline-block rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-6 py-2.5 font-display text-base font-bold text-white transition-colors hover:bg-indigo-500 active:translate-y-[3px] active:border-b-0"
          >
            Back to the Mission Map
          </a>
        )}
      </div>
    )
  }

  if (submitted && result) {
    return (
      <div className="relative space-y-4 py-12 text-center">
        {result.passed && <ConfettiBurst />}

        <div className={result.passed ? 'animate-bounce-soft inline-block' : 'inline-block'}>
          <Mascot pose={result.passed ? 'celebrating' : 'thinking'} className="h-28 w-28" />
        </div>
        <h2
          className={`font-display text-3xl font-bold ${
            result.passed ? 'text-green-700' : 'text-amber-700'
          }`}
        >
          {result.passed ? 'Mission Complete!' : 'Keep Practicing!'}
        </h2>
        {Number.isFinite(result.score) && (
          <p className="font-display text-lg font-bold text-gray-700">
            Score: {Math.round(result.score * 100)}%
          </p>
        )}

        {meta.assessmentType === 'MASTERY_CHALLENGE' && result.passed && (
          <div className="relative mx-auto max-w-sm rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4 text-left animate-pop-in">
            <div className="flex items-start gap-3">
              <Mascot pose="happy" className="h-12 w-12 flex-shrink-0" />
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-widest text-indigo-700">
                  The Founder
                </p>
                <p className="mt-0.5 text-base leading-relaxed text-indigo-950">
                  Well done, builder. Another pillar of the Republic stands because of you — and
                  what you mastered today will return in your Daily Drill, so keep it sharp.
                </p>
              </div>
            </div>
          </div>
        )}

        {result.calibration && <CalibrationCard calibration={result.calibration} />}

        {onComplete ? (
          <p className="text-base text-gray-600">Great work — continue your mission below.</p>
        ) : result.passed ? (
          <p className="text-base text-gray-600">Next mission unlocked. Head to the Mission Map!</p>
        ) : (
          <p className="text-base text-gray-600">Remediation has been assigned to strengthen your skills.</p>
        )}

        {!onComplete && (
          <a
            href="/student/map"
            className="mt-4 inline-block rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-6 py-2.5 font-display text-base font-bold text-white transition-colors hover:bg-indigo-500 active:translate-y-[3px] active:border-b-0"
          >
            Mission Map
          </a>
        )}
      </div>
    )
  }

  const currentQ = questions[currentIndex]
  const currentAnswer = answers[currentQ.questionId]
  const isLast = currentIndex === questions.length - 1
  const canAdvance =
    !!currentAnswer?.optionId && (!needsConfidence || currentAnswer?.confidence !== null)
  const letters = ['A', 'B', 'C', 'D', 'E', 'F']

  async function handleSubmit() {
    if (!meta || !attemptId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/assessment/${assessmentId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildAssessmentSubmitBody(attemptId, answers)),
      })
      const data = await res.json()
      // A non-2xx response is a failed submission — never render the completion
      // card for it (that masks real errors as "Keep Practicing!").
      if (!res.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Submission failed.')
      }
      setResult({
        passed: data.passed,
        score: data.score,
        feedback: data.feedback,
        calibration: data.calibration ?? null,
      })
      setSubmitted(true)
      onComplete?.({ passed: data.passed, score: data.score, reviewTopics: data.reviewTopics ?? null })
    } catch (e) {
      setError(e instanceof Error ? `${e.message} Please try again.` : 'Submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-gray-900">{meta.title}</h2>
        <span className="flex-shrink-0 rounded-full bg-indigo-100 px-3 py-1 font-display text-xs font-bold text-indigo-800">
          {currentIndex + 1} / {questions.length}
        </span>
      </div>

      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-indigo-100"
        role="progressbar"
        aria-label="Assessment progress"
        aria-valuenow={currentIndex + 1}
        aria-valuemin={1}
        aria-valuemax={questions.length}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div className="space-y-4 rounded-2xl border-2 border-indigo-100 bg-white p-5 shadow-card">
        {currentQ.stimulus && (
          <StimulusDisplay
            stimulusId={currentQ.stimulus.stimulusId}
            title={currentQ.stimulus.stimulusTitle}
            content={currentQ.stimulus.resolvedContent}
            resolvedLevel={currentQ.stimulus.resolvedLevel}
            fromVariant={currentQ.stimulus.fromVariant}
            glossaryAnnotations={currentQ.stimulus.glossaryAnnotations}
          />
        )}
        <p className="text-lg font-semibold leading-relaxed text-gray-900">{currentQ.prompt}</p>

        <div className="space-y-2.5" role="group" aria-label="Answer choices">
          {currentQ.options
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((opt, i) => {
              const isSelected = currentAnswer?.optionId === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    setAnswers((prev) => ({
                      ...prev,
                      [currentQ.questionId]: { optionId: opt.id, confidence: prev[currentQ.questionId]?.confidence ?? null },
                    }))
                  }
                  className={`flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-3 text-left text-base leading-snug transition-colors ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-950'
                      : 'border-gray-200 bg-white text-gray-800 hover:border-indigo-300 hover:bg-indigo-50/50'
                  }`}
                  aria-pressed={isSelected}
                >
                  <span
                    className={`mt-px flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {letters[i] ?? '•'}
                  </span>
                  <span className="pt-0.5">{opt.optionText}</span>
                </button>
              )
            })}
        </div>

        {needsConfidence && currentAnswer?.optionId && (
          <ConfidenceSelector
            value={currentAnswer?.confidence ?? null}
            onChange={(c) =>
              setAnswers((prev) => ({
                ...prev,
                [currentQ.questionId]: { optionId: prev[currentQ.questionId]?.optionId ?? '', confidence: c },
              }))
            }
          />
        )}
      </div>

      <div className="flex justify-end">
        {isLast ? (
          <button
            onClick={handleSubmit}
            disabled={!canAdvance || loading}
            className="rounded-2xl border-b-4 border-green-800 bg-green-600 px-6 py-2.5 font-display text-base font-bold text-white transition-colors hover:bg-green-500 active:translate-y-[3px] active:border-b-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0 disabled:active:border-b-4"
          >
            Submit Assessment
          </button>
        ) : (
          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            disabled={!canAdvance}
            className="rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-6 py-2.5 font-display text-base font-bold text-white transition-colors hover:bg-indigo-500 active:translate-y-[3px] active:border-b-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0 disabled:active:border-b-4"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  )
}

const CALIBRATION_ROWS: { key: keyof CalibrationSummary; label: string; emoji: string }[] = [
  { key: 'high', label: 'Very sure', emoji: '😎' },
  { key: 'medium', label: 'Pretty sure', emoji: '🙂' },
  { key: 'low', label: 'Not sure', emoji: '🤔' },
]

function CalibrationCard({ calibration }: { calibration: CalibrationSummary }) {
  const rows = CALIBRATION_ROWS.map((r) => {
    const tally = calibration[r.key]
    const total = tally.correct + tally.incorrect
    return { ...r, correct: tally.correct, total }
  }).filter((r) => r.total > 0)

  if (rows.length === 0) return null

  return (
    <div className="relative mx-auto mt-4 max-w-sm rounded-2xl border-2 border-sky-100 bg-sky-50 p-4 text-left animate-pop-in">
      <h3 className="font-display text-sm font-bold text-sky-900">How well did you know yourself?</h3>
      <p className="mt-0.5 text-sm text-sky-800">
        Matching your confidence to your results is a real test-taking skill — keep closing the gap!
      </p>
      <ul className="mt-3 space-y-1.5">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center justify-between text-base text-gray-800">
            <span>
              <span aria-hidden="true" className="mr-1.5">{r.emoji}</span>
              On <strong>{r.label}</strong> answers
            </span>
            <span className="font-display font-bold text-gray-700">
              {r.correct} / {r.total} right
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
