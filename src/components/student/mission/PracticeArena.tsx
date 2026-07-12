'use client'

/**
 * Practice Arena — the student-facing client for the Phase-6 adaptive
 * difficulty engine (spec §18), surfaced as an optional mission step between
 * Scenario Lab and the Readiness Check.
 *
 * Drives POST /api/assessment/[id]/start → GET /api/practice/[attemptId]/next-item
 * → POST /api/practice/[attemptId]/answer. All grading is server-side; the
 * client only ever sees safe questions (no isCorrect on options). When the
 * engine detects a struggle streak it serves a worked example (expert
 * reasoning + revealed answer) followed by a near-transfer question; a missed
 * near-transfer escalates to an assigned remediation.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mascot } from '@/components/ui/Mascot'

interface SafeOption {
  id: string
  optionText: string
}
interface SafeQuestion {
  id: string
  prompt: string
  cognitiveComplexity: string
  skillTag: string
  options: SafeOption[]
}
type NextItemPayload =
  | { type: 'QUESTION'; question: SafeQuestion }
  | {
      type: 'WORKED_EXAMPLE'
      question: SafeQuestion
      expertReasoning: string | null
      correctOptionId: string
      nearTransferQuestion: SafeQuestion | null
    }
  | { type: 'NEAR_TRANSFER'; question: SafeQuestion }
  | { type: 'NO_ITEMS_AVAILABLE' }

interface AnswerResponse {
  isCorrect: boolean
  nextAction:
    | 'NEXT_QUESTION'
    | 'WORKED_EXAMPLE'
    | 'NEAR_TRANSFER'
    | 'REMEDIATION_ESCALATED'
    | 'SESSION_COMPLETE'
  remediationAssigned?: boolean
}

interface PracticeArenaProps {
  assessmentId: string
  onFinish: () => void
  /** Questions answered before the recap offers to move on. */
  itemTarget?: number
}

type Phase =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'question'; question: SafeQuestion; isNearTransfer: boolean }
  | {
      kind: 'answered'
      question: SafeQuestion
      selectedId: string
      isCorrect: boolean
      nextAction: AnswerResponse['nextAction']
      remediationAssigned: boolean
      wasNearTransfer: boolean
    }
  | {
      kind: 'worked-example'
      question: SafeQuestion
      expertReasoning: string | null
      correctOptionId: string
      nearTransferQuestion: SafeQuestion | null
    }
  | { kind: 'done'; reason: 'target' | 'exhausted' }

const LETTERS = ['A', 'B', 'C', 'D', 'E']

export function PracticeArena({ assessmentId, onFinish, itemTarget = 5 }: PracticeArenaProps) {
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })
  const [answered, setAnswered] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [target, setTarget] = useState(itemTarget)
  const remediationNoted = useRef(false)

  const fetchNextItem = useCallback(
    async (id: string) => {
      setPhase({ kind: 'loading' })
      try {
        const res = await fetch(`/api/practice/${id}/next-item`)
        if (!res.ok) throw new Error('Could not load the next practice item.')
        const payload: NextItemPayload = await res.json()
        if (payload.type === 'NO_ITEMS_AVAILABLE') {
          setPhase({ kind: 'done', reason: 'exhausted' })
        } else if (payload.type === 'WORKED_EXAMPLE') {
          setPhase({
            kind: 'worked-example',
            question: payload.question,
            expertReasoning: payload.expertReasoning,
            correctOptionId: payload.correctOptionId,
            nearTransferQuestion: payload.nearTransferQuestion,
          })
        } else {
          setPhase({
            kind: 'question',
            question: payload.question,
            isNearTransfer: payload.type === 'NEAR_TRANSFER',
          })
        }
      } catch (e) {
        setPhase({ kind: 'error', message: e instanceof Error ? e.message : 'Something went wrong.' })
      }
    },
    []
  )

  useEffect(() => {
    let cancelled = false
    async function start() {
      try {
        const res = await fetch(`/api/assessment/${assessmentId}/start`, { method: 'POST' })
        if (!res.ok) throw new Error('Could not start a practice session.')
        const { attemptId: id } = await res.json()
        if (cancelled) return
        setAttemptId(id)
        await fetchNextItem(id)
      } catch (e) {
        if (!cancelled) {
          setPhase({ kind: 'error', message: e instanceof Error ? e.message : 'Something went wrong.' })
        }
      }
    }
    start()
    return () => {
      cancelled = true
    }
  }, [assessmentId, fetchNextItem])

  async function submitAnswer(question: SafeQuestion, optionId: string, wasNearTransfer: boolean) {
    if (!attemptId) return
    try {
      const res = await fetch(`/api/practice/${attemptId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: question.id, selectedOptionId: optionId }),
      })
      if (!res.ok) throw new Error('Could not submit your answer.')
      const data: AnswerResponse = await res.json()
      setAnswered((n) => n + 1)
      if (data.isCorrect) setCorrect((n) => n + 1)
      setPhase({
        kind: 'answered',
        question,
        selectedId: optionId,
        isCorrect: data.isCorrect,
        nextAction: data.nextAction,
        remediationAssigned: Boolean(data.remediationAssigned),
        wasNearTransfer,
      })
    } catch (e) {
      setPhase({ kind: 'error', message: e instanceof Error ? e.message : 'Something went wrong.' })
    }
  }

  function handleContinue(p: Extract<Phase, { kind: 'answered' }>) {
    if (!attemptId) return
    if (p.nextAction === 'SESSION_COMPLETE') {
      setPhase({ kind: 'done', reason: 'exhausted' })
      return
    }
    // Struggle streak → the engine wants to teach before asking again.
    if (p.nextAction === 'WORKED_EXAMPLE') {
      fetchNextItem(attemptId)
      return
    }
    if (answered >= target) {
      setPhase({ kind: 'done', reason: 'target' })
      return
    }
    fetchNextItem(attemptId)
  }

  // ── Render ──────────────────────────────────────────────────────────────

  if (phase.kind === 'loading') {
    return <p className="py-8 text-center text-base text-gray-600">Loading practice…</p>
  }

  if (phase.kind === 'error') {
    return (
      <div className="space-y-3 py-6 text-center">
        <p className="text-base font-semibold text-red-600">{phase.message}</p>
        <button
          type="button"
          onClick={onFinish}
          className="rounded-2xl border-2 border-b-4 border-gray-300 bg-white px-4 py-2 font-display text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 active:translate-y-[2px] active:border-b-2"
        >
          Continue to Readiness Check →
        </button>
      </div>
    )
  }

  if (phase.kind === 'done') {
    const pct = answered > 0 ? Math.round((correct / answered) * 100) : 0
    return (
      <div className="space-y-4 py-6 text-center">
        <Mascot
          pose={pct >= 80 ? 'celebrating' : pct >= 60 ? 'happy' : 'thinking'}
          className="mx-auto h-24 w-24"
        />
        <h3 className="font-display text-xl font-bold text-gray-900">
          Practice round complete — {correct} of {answered} correct
        </h3>
        <p className="text-base text-gray-600">
          {phase.reason === 'exhausted'
            ? "You've seen every practice question available right now."
            : pct >= 80
            ? "You're looking ready. Take the Readiness Check!"
            : 'Every rep counts — practice more, or see how the Readiness Check goes.'}
        </p>
        {remediationNoted.current && (
          <p className="text-base font-semibold text-amber-700">
            A Training Mission was added to your dashboard to rebuild a tricky skill.
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          {phase.reason !== 'exhausted' && (
            <button
              type="button"
              onClick={() => {
                setTarget((t) => t + 3)
                if (attemptId) fetchNextItem(attemptId)
              }}
              className="rounded-2xl border-2 border-b-4 border-indigo-300 bg-white px-4 py-2 font-display text-sm font-bold text-indigo-700 transition-colors hover:bg-indigo-50 active:translate-y-[2px] active:border-b-2"
            >
              Practice 3 more
            </button>
          )}
          <button
            type="button"
            onClick={onFinish}
            className="rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-5 py-2 font-display text-sm font-bold text-white transition-colors hover:bg-indigo-500 active:translate-y-[3px] active:border-b-0"
          >
            Continue to Readiness Check →
          </button>
        </div>
      </div>
    )
  }

  if (phase.kind === 'worked-example') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-3 animate-pop-in">
          <Mascot pose="thinking" className="h-12 w-12 flex-shrink-0" />
          <p className="text-base font-bold text-indigo-900">
            Let&apos;s slow down and study one together.
          </p>
        </div>
        <p className="text-base font-bold leading-7 text-gray-900">
          {phase.question.prompt}
        </p>
        <div className="space-y-2.5">
          {phase.question.options.map((opt, i) => {
            const isAnswer = opt.id === phase.correctOptionId
            return (
              <div
                key={opt.id}
                className={`flex items-start gap-3 rounded-2xl border-2 px-4 py-3 text-base leading-snug ${
                  isAnswer
                    ? 'border-green-500 bg-green-50 font-semibold text-green-900'
                    : 'border-gray-200 bg-white text-gray-600'
                }`}
              >
                <span
                  className={`mt-px flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold ${
                    isAnswer ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {isAnswer ? '✓' : LETTERS[i] ?? '•'}
                </span>
                <span className="pt-0.5">{opt.optionText}</span>
              </div>
            )
          })}
        </div>
        {phase.expertReasoning && (
          <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4">
            <p className="mb-1 font-display text-xs font-bold uppercase tracking-widest text-indigo-700">
              How an expert thinks about it
            </p>
            <p className="text-base leading-7 text-indigo-950">{phase.expertReasoning}</p>
          </div>
        )}
        {phase.nearTransferQuestion ? (
          <button
            type="button"
            onClick={() =>
              setPhase({
                kind: 'question',
                question: phase.nearTransferQuestion!,
                isNearTransfer: true,
              })
            }
            className="rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-5 py-2 font-display text-sm font-bold text-white transition-colors hover:bg-indigo-500 active:translate-y-[3px] active:border-b-0"
          >
            Now try a similar one →
          </button>
        ) : (
          <button
            type="button"
            onClick={() => attemptId && fetchNextItem(attemptId)}
            className="rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-5 py-2 font-display text-sm font-bold text-white transition-colors hover:bg-indigo-500 active:translate-y-[3px] active:border-b-0"
          >
            Continue →
          </button>
        )}
      </div>
    )
  }

  if (phase.kind === 'answered') {
    if (phase.remediationAssigned && !remediationNoted.current) {
      remediationNoted.current = true
    }
    return (
      <div className="space-y-4">
        <p className="text-base font-bold leading-7 text-gray-900">
          {phase.question.prompt}
        </p>
        <div className="space-y-2.5">
          {phase.question.options.map((opt, i) => {
            const isSelected = opt.id === phase.selectedId
            return (
              <div
                key={opt.id}
                className={`flex items-start gap-3 rounded-2xl border-2 px-4 py-3 text-base leading-snug ${
                  isSelected
                    ? phase.isCorrect
                      ? 'border-green-500 bg-green-50 text-green-900'
                      : 'border-amber-500 bg-amber-50 text-amber-900 animate-wiggle'
                    : 'border-gray-200 bg-white text-gray-600'
                }`}
              >
                <span
                  className={`mt-px flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold ${
                    isSelected
                      ? phase.isCorrect
                        ? 'bg-green-500 text-white'
                        : 'bg-amber-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {isSelected ? (phase.isCorrect ? '✓' : '✗') : LETTERS[i] ?? '•'}
                </span>
                <span className="pt-0.5">{opt.optionText}</span>
              </div>
            )
          })}
        </div>
        <p
          role="status"
          className={`text-base font-semibold ${phase.isCorrect ? 'text-green-700' : 'text-amber-700'}`}
        >
          {phase.isCorrect
            ? '✓ Correct!'
            : phase.nextAction === 'WORKED_EXAMPLE'
            ? "✗ Not quite — let's study one together before the next question."
            : phase.wasNearTransfer && phase.remediationAssigned
            ? '✗ Not quite. A Training Mission was added to your dashboard to rebuild this skill — keep going for now.'
            : '✗ Not quite — keep going, the next one is a fresh start.'}
        </p>
        <button
          type="button"
          onClick={() => handleContinue(phase)}
          className="rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-5 py-2 font-display text-sm font-bold text-white transition-colors hover:bg-indigo-500 active:translate-y-[3px] active:border-b-0"
        >
          Continue →
        </button>
      </div>
    )
  }

  // phase.kind === 'question'
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-xs font-bold uppercase tracking-widest text-gray-600">
          {phase.isNearTransfer ? 'Try this similar one' : `Question ${answered + 1}`}
        </p>
        <span className="rounded-full bg-indigo-100 px-3 py-1 font-display text-xs font-bold text-indigo-800">
          {correct} / {answered} correct
        </span>
      </div>
      <p className="text-base font-bold leading-7 text-gray-900">{phase.question.prompt}</p>
      <div className="space-y-2.5" role="group" aria-label="Answer choices">
        {phase.question.options.map((opt, i) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => submitAnswer(phase.question, opt.id, phase.isNearTransfer)}
            className="flex w-full items-start gap-3 rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 text-left text-base leading-snug text-gray-800 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50"
          >
            <span className="mt-px flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 font-display text-sm font-bold text-gray-600">
              {LETTERS[i] ?? '•'}
            </span>
            <span className="pt-0.5">{opt.optionText}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
