'use client'

/**
 * Renders one lesson step by its parsed content kind (ADR 0013):
 *   text             — instructional text with read-aloud + glossary popovers
 *   timeline         — visual organizer (timeline / cause-effect chain)
 *   worked-example   — problem + progressive "show my thinking" reveal (§18)
 *   interactive-check— ungraded self-check with confidence + per-option feedback
 *   source-analysis  — passage via StimulusDisplay (read-aloud + chunking) + guiding questions
 *
 * `onAttempted(stepId)` fires once per step when the student has engaged with
 * every check the step contains — the walkthrough uses it to gate "Next".
 * All interactions are client-local; nothing is persisted (no grading).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { parseStepContent, type CheckOption } from '@/lib/lesson-content'
import { buildGlossaryAnnotations, type GlossaryTerm } from '@/lib/reading-load'
import { StimulusDisplay, renderAnnotatedText } from '@/components/reading-load/StimulusDisplay'

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
  /** Tier-2 verbs + tier-3 civics terms for note glossary popovers. */
  glossaryTerms?: GlossaryTerm[]
}

export function LessonStepRenderer({ step, onAttempted, glossaryTerms }: LessonStepRendererProps) {
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
  if (parsed.kind === 'timeline') {
    return (
      <TimelineView intro={parsed.intro} connector={parsed.connector} events={parsed.events} />
    )
  }
  return <NoteView text={parsed.text} glossaryTerms={glossaryTerms} />
}

// ── Note text: read-aloud + glossary popovers (spec §31.2 supports) ──────────

function NoteView({ text, glossaryTerms }: { text: string; glossaryTerms?: GlossaryTerm[] }) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [hasSpeech, setHasSpeech] = useState(false)

  useEffect(() => {
    setHasSpeech(typeof window !== 'undefined' && 'speechSynthesis' in window)
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
    }
  }, [])

  const toggleReadAloud = useCallback(() => {
    if (!hasSpeech) return
    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.9
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
    setIsSpeaking(true)
  }, [hasSpeech, isSpeaking, text])

  const annotations =
    glossaryTerms && glossaryTerms.length > 0 ? buildGlossaryAnnotations(text, glossaryTerms, 2) : []
  const paragraphs = text.split(/\n\n+/)

  return (
    <div className="space-y-3">
      {hasSpeech && (
        <div className="flex justify-end">
          <button
            type="button"
            aria-label={isSpeaking ? 'Stop reading' : 'Read this section aloud'}
            title={isSpeaking ? 'Stop' : 'Read aloud'}
            onClick={toggleReadAloud}
            className={`p-1.5 rounded-md text-sm transition-colors ${
              isSpeaking
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isSpeaking ? '⏹' : '🔊'}
          </button>
        </div>
      )}
      <div className="text-sm leading-relaxed text-gray-700 space-y-3">
        {paragraphs.map((para, i) => (
          <p key={i} className="whitespace-pre-line">
            {annotations.length > 0 ? renderAnnotatedText(para, annotations) : para}
          </p>
        ))}
      </div>
    </div>
  )
}

// ── Timeline / cause-effect chain (visual organizer) ─────────────────────────

function TimelineView({
  intro,
  connector,
  events,
}: {
  intro?: string
  connector: 'line' | 'arrow'
  events: { marker: string; label: string; detail?: string }[]
}) {
  return (
    <div className="space-y-3">
      {intro && <p className="text-sm leading-relaxed text-gray-700">{intro}</p>}
      <ol className="space-y-0">
        {events.map((event, i) => (
          <li key={i} className="flex gap-3">
            {/* Marker column */}
            <div className="flex flex-col items-center">
              <span className="min-w-[64px] rounded-full bg-indigo-600 px-2 py-1 text-center text-xs font-bold text-white">
                {event.marker}
              </span>
              {i < events.length - 1 && (
                <div className="flex flex-1 flex-col items-center py-0.5" aria-hidden="true">
                  <span className="w-0.5 flex-1 bg-indigo-200" />
                  {connector === 'arrow' && (
                    <span className="text-indigo-400 text-xs leading-none">▼</span>
                  )}
                </div>
              )}
            </div>
            {/* Event content */}
            <div className={i < events.length - 1 ? 'pb-4' : ''}>
              <p className="text-sm font-semibold text-gray-900 leading-snug">{event.label}</p>
              {event.detail && (
                <p className="mt-0.5 text-sm leading-relaxed text-gray-600">{event.detail}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
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
//
// Flow: pick an answer → say how sure you are → see feedback + a calibration
// nudge (§17 metacognition, practiced here with zero stakes). After the first
// reveal the student can explore other options' feedback freely.

const CONFIDENCE_CHOICES = [
  { key: 'low', label: 'Not sure', emoji: '🤔' },
  { key: 'medium', label: 'Pretty sure', emoji: '🙂' },
  { key: 'high', label: 'Very sure', emoji: '😎' },
] as const

type ConfidenceKey = (typeof CONFIDENCE_CHOICES)[number]['key']

function calibrationNudge(correct: boolean, confidence: ConfidenceKey): string {
  if (correct && confidence === 'high') return 'Great calibration — you knew that you knew it.'
  if (correct && confidence === 'low') return 'You knew more than you thought — trust your training.'
  if (!correct && confidence === 'high') return 'You felt sure but missed — that\'s the signal to re-read this idea.'
  if (!correct && confidence === 'low') return 'You sensed it was shaky — noticing that is a real skill.'
  return correct ? 'Nice — your confidence matched the result.' : 'Close — compare your thinking with the feedback.'
}

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
  const [confidence, setConfidence] = useState<ConfidenceKey | null>(null)
  const [revealed, setRevealed] = useState(false)
  const attemptedRef = useRef(false)

  function choose(i: number) {
    setSelected(i)
    // Before the first reveal, changing the pick resets the confidence prompt.
    if (!revealed) setConfidence(null)
  }

  function chooseConfidence(key: ConfidenceKey) {
    setConfidence(key)
    setRevealed(true)
    if (!attemptedRef.current) {
      attemptedRef.current = true
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
          const showState = revealed && isSelected
          const stateClasses = showState
            ? opt.correct
              ? 'border-green-500 bg-green-50'
              : 'border-amber-500 bg-amber-50'
            : isSelected
            ? 'border-indigo-500 bg-indigo-50'
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
              {showState && (
                <p
                  role="status"
                  className={`mt-1 ml-1 text-sm leading-relaxed ${
                    opt.correct ? 'text-green-800' : 'text-amber-800'
                  }`}
                >
                  {opt.correct ? '✓ ' : ''}
                  {opt.feedback}
                  {confidence && (
                    <span className="block mt-0.5 text-xs text-gray-600 italic">
                      {calibrationNudge(opt.correct, confidence)}
                    </span>
                  )}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {selected !== null && !revealed && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
          <p className="text-xs font-semibold text-indigo-800 mb-2">How sure are you?</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Confidence">
            {CONFIDENCE_CHOICES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => chooseConfidence(c.key)}
                className="rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-sm font-medium text-indigo-800 hover:bg-indigo-100 transition-colors"
              >
                <span aria-hidden="true" className="mr-1">
                  {c.emoji}
                </span>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}
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
