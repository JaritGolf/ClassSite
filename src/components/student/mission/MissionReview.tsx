'use client'

/**
 * Mastered-mission review — lets a student freely revisit a mission they've
 * already mastered.
 *
 * Mirrors MissionFlow's phases and reuses the SAME lesson-content components
 * (TrainingWalkthrough / VocabPanel / ScenarioLab / StepIndicator) with the
 * `ungated`/`onStepClick` props already built for the teacher-only
 * MissionWalkthrough (ADR 0015) — every step is a click away, freely
 * navigable. Deliberately does NOT pass `revealAnswers`: the ungraded lesson
 * self-checks stay interactive (they're never persisted, so replaying them is
 * harmless), unlike the teacher walkthrough's static answer-key mode.
 *
 * Assessment-type steps (Pre-Check, Vocab Check, Readiness Check, Mastery
 * Challenge) never render a live AssessmentPlayer here — starting one would
 * create a real new AssessmentAttempt. Instead each shows
 * AssessmentAttemptReview: every past submitted attempt, per-question
 * correct/incorrect against the student's own answer, answer key withheld.
 */

import { useState } from 'react'
import Link from 'next/link'
import { trainingStepsOf, vocabStepsOf, scenarioStepsOf } from '@/lib/lesson-content'
import type { GlossaryTerm } from '@/lib/reading-load'
import { StepIndicator } from './StepIndicator'
import { TrainingWalkthrough } from './TrainingWalkthrough'
import { VocabPanel, type TermView } from './VocabPanel'
import { ScenarioLab } from './ScenarioLab'
import { CompletionCodeCard } from './CompletionCodeCard'
import type { MasteryAttemptRecord } from '@/lib/local-progress/types'
import type { LessonStepView } from './LessonStepRenderer'

const STEP_ORDER = [
  'pre-check',
  'briefing',
  'vocab',
  'training',
  'scenario-lab',
  'practice',
  'readiness-check',
  'mastery-challenge',
] as const

type Step = (typeof STEP_ORDER)[number]

export interface MissionReviewData {
  benchmarkCode: string
  benchmarkTitle: string
  lessonSummary: string | null
  lessonBody: string | null
  studentFriendlyTarget: string
  lessonSteps: LessonStepView[]
  terms: TermView[]
  glossaryTerms: GlossaryTerm[]
  /** This device's record of Mastery Challenge attempts (date, score, pass). */
  masteryAttempts: MasteryAttemptRecord[]
  completionCode: string | null
}

export function MissionReview({ mission }: { mission: MissionReviewData }) {
  const [currentStep, setCurrentStep] = useState<Step>('pre-check')

  const trainingSteps = trainingStepsOf(mission.lessonSteps)
  const vocabSteps = vocabStepsOf(mission.lessonSteps)
  const scenarioSteps = scenarioStepsOf(mission.lessonSteps)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-green-200 bg-green-50 px-4 py-3">
        <p className="text-sm font-semibold text-green-900">
          <span className="mr-2 rounded-full bg-green-600 px-2 py-0.5 font-display text-xs font-bold uppercase tracking-wide text-white">
            Mastered
          </span>
          You already mastered this mission — look back at anything, any time. Click a step
          below to jump straight to it.
        </p>
        <Link
          href="/student/map"
          className="flex-shrink-0 rounded-xl border-2 border-b-4 border-green-300 bg-white px-3 py-1.5 font-display text-sm font-bold text-green-700 transition-colors hover:bg-green-50 active:translate-y-[2px] active:border-b-2"
        >
          ← Mission Map
        </Link>
      </div>

      <StepIndicator
        currentStep={currentStep}
        completedSteps={STEP_ORDER as unknown as string[]}
        onStepClick={(key) => setCurrentStep(key as Step)}
      />

      {currentStep === 'pre-check' && (
        <PhasePanel title="Mission Pre-Check" note="Ungraded — it never counted toward your score.">
          <p className="text-base text-gray-700">
            The pre-check was a warm-up. Its answers are not kept.
          </p>
        </PhasePanel>
      )}

      {currentStep === 'briefing' && (
        <PhasePanel title="Mission Briefing" note="The big picture for this mission.">
          <p className="max-w-prose whitespace-pre-line text-base leading-7 text-gray-800">
            {mission.lessonBody ?? mission.lessonSummary ?? mission.studentFriendlyTarget}
          </p>
        </PhasePanel>
      )}

      {currentStep === 'vocab' && (
        <div className="space-y-3">
          {/* vocabCheckAssessmentId=null keeps the term list visible without
              embedding a live, re-attemptable Word Builder assessment. */}
          <VocabPanel
            terms={mission.terms}
            vocabSteps={vocabSteps}
            vocabCheckAssessmentId={null}
            onContinue={() => setCurrentStep('training')}
          />
        </div>
      )}

      {currentStep === 'training' && (
        <TrainingWalkthrough
          steps={trainingSteps}
          glossaryTerms={mission.glossaryTerms}
          onComplete={() => setCurrentStep('scenario-lab')}
          ungated
        />
      )}

      {currentStep === 'scenario-lab' && (
        <ScenarioLab steps={scenarioSteps} onComplete={() => setCurrentStep('practice')} ungated />
      )}

      {currentStep === 'practice' && (
        <PhasePanel title="Practice Arena" note="Optional adaptive practice — not part of this review.">
          <p className="text-base text-gray-700">
            You already worked through the practice questions for this mission — nice work.
          </p>
        </PhasePanel>
      )}

      {currentStep === 'readiness-check' && (
        <PhasePanel title="Readiness Check" note="Passing this unlocked the Mastery Challenge.">
          <p className="text-base text-gray-700">You passed the Readiness Check for this mission.</p>
        </PhasePanel>
      )}

      {currentStep === 'mastery-challenge' && (
        <PhasePanel title="Mastery Challenge" note="Every attempt saved on this device.">
          {mission.completionCode && <CompletionCodeCard code={mission.completionCode} compact />}
          {mission.masteryAttempts.length === 0 ? (
            <p className="text-base text-gray-700">No attempts are saved on this device.</p>
          ) : (
            <ul className="space-y-2">
              {mission.masteryAttempts.map((a, i) => (
                <li
                  key={`${a.at}-${i}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-indigo-100 bg-white px-3 py-2"
                >
                  <span className="font-display text-sm font-bold text-gray-900">Attempt {i + 1}</span>
                  <span className="text-sm text-gray-700">
                    {new Date(a.at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800">
                    Score {Math.round(a.score * 100)}%
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      a.passed ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {a.passed ? 'Passed' : 'Not passed'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </PhasePanel>
      )}
    </div>
  )
}

function PhasePanel({
  title,
  note,
  children,
}: {
  title: string
  note: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3 rounded-2xl border-2 border-indigo-100 bg-white p-5 shadow-card">
      <div>
        <h2 className="font-display text-xl font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-600">{note}</p>
      </div>
      {children}
    </div>
  )
}
