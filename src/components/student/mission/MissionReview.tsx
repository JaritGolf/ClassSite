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
import type { AttemptReview } from '@/lib/assessment'
import { StepIndicator } from './StepIndicator'
import { TrainingWalkthrough } from './TrainingWalkthrough'
import { VocabPanel, type TermView } from './VocabPanel'
import { ScenarioLab } from './ScenarioLab'
import { AssessmentAttemptReview } from './AssessmentAttemptReview'
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
  attemptReviews: {
    preCheck: AttemptReview[]
    vocabCheck: AttemptReview[]
    readinessCheck: AttemptReview[]
    masteryChallenge: AttemptReview[]
  }
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
          <AssessmentAttemptReview
            attempts={mission.attemptReviews.preCheck}
            emptyMessage="No pre-check on record for this mission."
          />
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
          <PhasePanel title="Word Builder" note="Your past Word Builder results.">
            <AssessmentAttemptReview
              attempts={mission.attemptReviews.vocabCheck}
              emptyMessage="No Word Builder attempts on record for this mission."
            />
          </PhasePanel>
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
          <AssessmentAttemptReview
            attempts={mission.attemptReviews.readinessCheck}
            emptyMessage="No readiness check on record for this mission."
          />
        </PhasePanel>
      )}

      {currentStep === 'mastery-challenge' && (
        <PhasePanel
          title="Mastery Challenge"
          note="Every attempt you've submitted, across every form you were served."
        >
          <AssessmentAttemptReview
            attempts={mission.attemptReviews.masteryChallenge}
            emptyMessage="No Mastery Challenge attempt on record for this mission."
          />
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
