'use client'

/**
 * Renders one lesson step by its parsed content kind (ADR 0013 + ADR 0015):
 *   text             — instructional text with read-aloud + glossary popovers
 *   timeline         — visual organizer (timeline / cause-effect chain)
 *   worked-example   — problem + progressive "show my thinking" reveal (§18)
 *   interactive-check— ungraded self-check with confidence + per-option feedback
 *   source-analysis  — passage via StimulusDisplay (read-aloud + chunking) + guiding questions
 *   video            — click-to-load privacy facade (media/VideoStepView)
 *   image            — SVG illustration or PD photo (media/ImageStepView)
 *   diagram          — flow/cycle/venn/comparison organizer (media/DiagramStepView)
 *   infographic      — stat-and-fact panel (media/InfographicStepView)
 *
 * `onAttempted(stepId)` fires once per step when the student has engaged with
 * every check the step contains — the walkthrough uses it to gate "Next".
 * All interactions are client-local; nothing is persisted (no grading).
 */

import { useRef, useState } from 'react'
import { parseStepContent, type CheckOption } from '@/lib/lesson-content'
import { seededShuffle } from '@/lib/shuffle'
import { buildGlossaryAnnotations, type GlossaryTerm } from '@/lib/reading-load'
import { StimulusDisplay, renderAnnotatedText } from '@/components/reading-load/StimulusDisplay'
import { Mascot } from '@/components/ui/Mascot'
import { ReadAloudButton } from '@/components/ui/ReadAloudButton'
import { VideoStepView } from './media/VideoStepView'
import { ImageStepView } from './media/ImageStepView'
import { DiagramStepView } from './media/DiagramStepView'
import { InfographicStepView } from './media/InfographicStepView'

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

export function LessonStepRenderer({
  step,
  onAttempted,
  glossaryTerms,
}: LessonStepRendererProps) {
  const parsed = parseStepContent(step.stepType, step.content)

  if (parsed.kind === 'worked-example') {
    return <WorkedExampleView {...parsed} />
  }
  if (parsed.kind === 'interactive-check') {
    return (
      <CheckQuestion
        key={step.id}
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
  if (parsed.kind === 'video') {
    const { kind: _kind, ...video } = parsed
    return <VideoStepView {...video} />
  }
  if (parsed.kind === 'image') {
    const { kind: _kind, ...image } = parsed
    return <ImageStepView {...image} />
  }
  if (parsed.kind === 'diagram') {
    return <DiagramStepView diagram={parsed.diagram} />
  }
  if (parsed.kind === 'infographic') {
    return <InfographicStepView infographic={parsed.infographic} />
  }
  return <NoteView text={parsed.text} glossaryTerms={glossaryTerms} />
}

// ── Note text: read-aloud + glossary popovers (spec §31.2 supports) ──────────

function NoteView({ text, glossaryTerms }: { text: string; glossaryTerms?: GlossaryTerm[] }) {
  const annotations =
    glossaryTerms && glossaryTerms.length > 0 ? buildGlossaryAnnotations(text, glossaryTerms, 2) : []
  const paragraphs = text.split(/\n\n+/)

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ReadAloudButton text={text} />
      </div>
      <div className="max-w-prose space-y-4 text-base leading-7 text-gray-800">
        {paragraphs.map((para, i) => (
          <p key={i} className={`whitespace-pre-line ${i === 0 ? 'text-lg leading-8' : ''}`}>
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
    <div className="space-y-4">
      {intro && <p className="max-w-prose text-base leading-7 text-gray-800">{intro}</p>}
      <ol className="space-y-0">
        {events.map((event, i) => (
          <li key={i} className="flex gap-4">
            {/* Marker column */}
            <div className="flex flex-col items-center">
              <span className="min-w-[72px] rounded-full border-b-2 border-indigo-800 bg-gradient-to-b from-indigo-500 to-indigo-600 px-2.5 py-1.5 text-center font-display text-xs font-bold text-white">
                {event.marker}
              </span>
              {i < events.length - 1 && (
                <div className="flex flex-1 flex-col items-center py-1" aria-hidden="true">
                  <span className="w-1 flex-1 rounded-full bg-indigo-200" />
                  {connector === 'arrow' && (
                    <span className="text-sm leading-none text-indigo-400">▼</span>
                  )}
                </div>
              )}
            </div>
            {/* Event content */}
            <div className={i < events.length - 1 ? 'pb-5' : ''}>
              <p className="text-base font-bold leading-snug text-gray-900">{event.label}</p>
              {event.detail && (
                <p className="mt-1 max-w-prose text-base leading-7 text-gray-600">{event.detail}</p>
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
      <div className="flex items-start gap-3 rounded-2xl border-2 border-gray-200 bg-gray-50 p-4">
        <Mascot pose="thinking" className="h-14 w-14 flex-shrink-0" />
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-widest text-gray-600">
            The problem
          </p>
          <p className="mt-1 whitespace-pre-line text-base leading-7 text-gray-800">{problem}</p>
        </div>
      </div>

      {revealed > 0 && (
        <ol className="space-y-2" aria-label="Expert thinking steps">
          {thinkAloud.slice(0, revealed).map((thought, i) => (
            <li key={i} className="flex gap-3 animate-pop-in">
              <span className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 font-display text-sm font-bold text-white">
                {i + 1}
              </span>
              <p className="rounded-2xl rounded-tl-md border-2 border-indigo-100 bg-indigo-50 px-4 py-2.5 text-base leading-7 text-indigo-950">
                {thought}
              </p>
            </li>
          ))}
        </ol>
      )}

      {!allRevealed ? (
        <button
          type="button"
          onClick={() => setRevealed((n) => n + 1)}
          className="rounded-2xl border-2 border-b-4 border-indigo-300 bg-white px-5 py-2.5 font-display text-base font-bold text-indigo-700 transition-colors hover:bg-indigo-50 active:translate-y-[2px] active:border-b-2"
        >
          {revealed === 0 ? 'Show my thinking →' : 'Next thought →'}
        </button>
      ) : (
        <div className="space-y-3 animate-pop-in">
          <div className="rounded-2xl border-2 border-green-300 bg-green-50 p-4">
            <p className="font-display text-xs font-bold uppercase tracking-widest text-green-700">
              Answer
            </p>
            <p className="mt-1 text-base font-bold leading-7 text-green-900">{answer}</p>
          </div>
          <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4">
            <p className="font-display text-xs font-bold uppercase tracking-widest text-indigo-700">
              Why this works
            </p>
            <p className="mt-1 text-base leading-7 text-indigo-950">{whyItWorks}</p>
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
  // Authored check JSON lists the correct option first — shuffle so the right
  // answer isn't predictably "A" (ungraded self-check, so a client-side
  // shuffle is safe; feedback travels with each option object). Seeded by the
  // question text, not Math.random(): the server and client must agree or
  // SSR'd instances (e.g. the teacher lesson preview) fail hydration.
  const [shuffledOptions] = useState<CheckOption[]>(() => seededShuffle(options, question))
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
      <p className="text-base font-bold leading-7 text-gray-900">{question}</p>
      <div className="space-y-2.5" role="group" aria-label="Answer choices">
        {shuffledOptions.map((opt, i) => {
          const isSelected = selected === i
          const showState = revealed && isSelected
          const stateClasses = showState
            ? opt.correct
              ? 'border-green-500 bg-green-50'
              : 'border-amber-500 bg-amber-50 animate-wiggle'
            : isSelected
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50'
          const letterClasses = showState
            ? opt.correct
              ? 'bg-green-500 text-white'
              : 'bg-amber-500 text-white'
            : isSelected
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-100 text-gray-600'
          return (
            <div key={i}>
              <button
                type="button"
                onClick={() => choose(i)}
                aria-pressed={isSelected}
                className={`flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-3 text-left text-base leading-snug text-gray-800 transition-colors ${stateClasses}`}
              >
                <span
                  className={`mt-px flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold ${letterClasses}`}
                >
                  {showState ? (opt.correct ? '✓' : '✗') : letters[i] ?? '•'}
                </span>
                <span className="pt-0.5">{opt.text}</span>
              </button>
              {showState && (
                <div
                  role="status"
                  className={`mt-1.5 rounded-xl border px-3 py-2 text-base leading-7 animate-pop-in ${
                    opt.correct
                      ? 'border-green-200 bg-green-50 text-green-900'
                      : 'border-amber-200 bg-amber-50 text-amber-900'
                  }`}
                >
                  {opt.correct ? '✓ ' : ''}
                  {opt.feedback}
                  {confidence && (
                    <span className="mt-1 block text-sm italic text-gray-600">
                      {calibrationNudge(opt.correct, confidence)}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selected !== null && !revealed && (
        <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-3 animate-pop-in">
          <p className="mb-2 font-display text-sm font-bold text-indigo-800">How sure are you?</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Confidence">
            {CONFIDENCE_CHOICES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => chooseConfidence(c.key)}
                className="rounded-xl border-2 border-b-4 border-indigo-200 bg-white px-4 py-2 text-sm font-bold text-indigo-800 transition-colors hover:bg-indigo-100 active:translate-y-[2px] active:border-b-2"
              >
                <span aria-hidden="true" className="mr-1.5">
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
      <p className="text-sm italic text-gray-600">{sourceAttribution}</p>

      {guidingQuestions.map((gq, qi) => (
        <div key={qi} className="rounded-2xl border-2 border-indigo-100 bg-white p-4 shadow-card">
          <p className="mb-2 font-display text-xs font-bold uppercase tracking-widest text-indigo-600">
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
