'use client'

/**
 * Practice Arena — the student-facing client for the Phase-6 adaptive
 * difficulty engine (spec §18), surfaced as an optional mission step between
 * Scenario Lab and the Readiness Check.
 *
 * Drives POST /api/practice/next-item and POST /api/practice/answer. The
 * adaptive session state lives HERE, in the browser: each request sends it and
 * the server keeps nothing. Grading is still server-side and the client only
 * ever sees safe questions (no key on options). A struggle streak brings a
 * worked example followed by a similar question; missing that one assigns a
 * Training Mission on this device.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mascot } from '@/components/ui/Mascot'
import {
  applyCorrectAnswer,
  applyIncorrectAnswer,
  applyNearTransferCorrect,
  applyNearTransferIncorrect,
  initialState,
  type AdaptiveState,
} from '@/lib/adaptive-difficulty/transitions'
import { buildQuestionAnswerBody } from '@/lib/assessment/wire'
import { useLocalProgress } from '@/lib/local-progress/useLocalProgress'
import { assignRemediations, noteQuestions, recordStreakActivity } from '@/lib/local-progress/engine'

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

type NextAction = 'NEXT_QUESTION' | 'WORKED_EXAMPLE' | 'REMEDIATION_ESCALATED'

interface AnswerResponse {
  isCorrect: boolean
  correctOptionText: string | null
  selectedFeedback: string | null
  benchmarkCode: string
  remediation: { itemId: string; title: string }[]
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
      nextAction: NextAction
      remediationAssigned: boolean
      wasNearTransfer: boolean
      correctOptionText: string | null
      selectedFeedback: string | null
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
  const { update } = useLocalProgress()
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })
  const [answered, setAnswered] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [target, setTarget] = useState(itemTarget)
  const remediationNoted = useRef(false)
  // Adaptive state and the questions seen this session — held in the browser.
  const stateRef = useRef<AdaptiveState>(initialState)
  const seenRef = useRef<string[]>([])

  const fetchNextItem = useCallback(async () => {
    setPhase({ kind: 'loading' })
    try {
      const res = await fetch('/api/practice/next-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId,
          state: stateRef.current,
          seenQuestionIds: seenRef.current,
        }),
      })
      if (!res.ok) throw new Error('Could not load the next practice item.')
      const data: { payload: NextItemPayload; state: AdaptiveState } = await res.json()
      stateRef.current = data.state
      const payload = data.payload
      if (payload.type === 'NO_ITEMS_AVAILABLE') {
        setPhase({ kind: 'done', reason: 'exhausted' })
      } else if (payload.type === 'WORKED_EXAMPLE') {
        if (payload.nearTransferQuestion) seenRef.current.push(payload.nearTransferQuestion.id)
        setPhase({
          kind: 'worked-example',
          question: payload.question,
          expertReasoning: payload.expertReasoning,
          correctOptionId: payload.correctOptionId,
          nearTransferQuestion: payload.nearTransferQuestion,
        })
      } else {
        seenRef.current.push(payload.question.id)
        setPhase({
          kind: 'question',
          question: payload.question,
          isNearTransfer: payload.type === 'NEAR_TRANSFER',
        })
      }
    } catch (e) {
      setPhase({ kind: 'error', message: e instanceof Error ? e.message : 'Something went wrong.' })
    }
  }, [assessmentId])

  useEffect(() => {
    stateRef.current = initialState
    seenRef.current = []
    void fetchNextItem()
  }, [fetchNextItem])

  async function submitAnswer(question: SafeQuestion, optionId: string, wasNearTransfer: boolean) {
    try {
      const res = await fetch('/api/practice/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...buildQuestionAnswerBody({ questionId: question.id, selectedOptionId: optionId }),
          // A missed near-transfer question escalates to a Training Mission.
          suggestRemediation: wasNearTransfer,
        }),
      })
      if (!res.ok) throw new Error('Could not submit your answer.')
      const data: AnswerResponse = await res.json()

      // Advance the adaptive state machine here — same pure transitions the
      // server used to run.
      let nextAction: NextAction = 'NEXT_QUESTION'
      let remediationAssigned = false
      const state = stateRef.current
      if (state.pendingNearTransfer) {
        if (data.isCorrect) {
          stateRef.current = applyNearTransferCorrect(state).state
        } else {
          stateRef.current = applyNearTransferIncorrect(state).state
          nextAction = 'REMEDIATION_ESCALATED'
          remediationAssigned = data.remediation.length > 0
        }
      } else if (data.isCorrect) {
        stateRef.current = applyCorrectAnswer(state)
      } else {
        stateRef.current = applyIncorrectAnswer(state, question.id)
        if (stateRef.current.pendingWorkedExample) nextAction = 'WORKED_EXAMPLE'
      }

      update((p) => {
        let next = noteQuestions(
          recordStreakActivity(p, new Date()),
          [question.id],
          data.isCorrect ? [] : [question.id]
        )
        if (remediationAssigned) {
          next = assignRemediations(next, data.benchmarkCode, data.remediation, new Date())
        }
        return next
      })

      setAnswered((n) => n + 1)
      if (data.isCorrect) setCorrect((n) => n + 1)
      setPhase({
        kind: 'answered',
        question,
        selectedId: optionId,
        isCorrect: data.isCorrect,
        nextAction,
        remediationAssigned,
        wasNearTransfer,
        correctOptionText: data.correctOptionText ?? null,
        selectedFeedback: data.selectedFeedback ?? null,
      })
    } catch (e) {
      setPhase({ kind: 'error', message: e instanceof Error ? e.message : 'Something went wrong.' })
    }
  }

  function handleContinue(p: Extract<Phase, { kind: 'answered' }>) {
    // Struggle streak → teach before asking again.
    if (p.nextAction === 'WORKED_EXAMPLE') {
      void fetchNextItem()
      return
    }
    if (answered >= target) {
      setPhase({ kind: 'done', reason: 'target' })
      return
    }
    void fetchNextItem()
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
                void fetchNextItem()
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
            onClick={() => void fetchNextItem()}
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
        {(phase.selectedFeedback || (!phase.isCorrect && phase.correctOptionText)) && (
          <div
            className={`rounded-2xl border-2 p-4 animate-pop-in ${
              phase.isCorrect
                ? 'border-green-200 bg-green-50 text-green-900'
                : 'border-amber-200 bg-amber-50 text-amber-900'
            }`}
          >
            {!phase.isCorrect && phase.correctOptionText && (
              <p className="text-base">
                The answer was: <strong>{phase.correctOptionText}</strong>
              </p>
            )}
            {phase.selectedFeedback && (
              <p className={`text-sm leading-relaxed ${!phase.isCorrect && phase.correctOptionText ? 'mt-1.5' : ''}`}>
                {phase.selectedFeedback}
              </p>
            )}
          </div>
        )}
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
