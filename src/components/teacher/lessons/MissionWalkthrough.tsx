'use client'

/**
 * "Walk it like a student" — teacher mission walkthrough (ADR 0015).
 *
 * Mirrors the student MissionFlow's 8 phases with the SAME child components
 * (StepIndicator / TrainingWalkthrough / VocabPanel / ScenarioLab /
 * LessonStepRenderer) but zero gating: every step is a click away (clickable
 * step map + always-enabled Next/Back), checks render as answer keys, and the
 * server-graded assessments appear as read-only question previews — no
 * AssessmentAttempt is ever created. Deliberately does NOT touch MissionFlow:
 * student behavior stays byte-identical.
 */

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { trainingStepsOf, vocabStepsOf, scenarioStepsOf } from '@/lib/lesson-content'
import type { GlossaryTerm } from '@/lib/reading-load'
import type { AssessmentPreview, PreviewAssessmentType } from '@/lib/lesson-media'
import { StepIndicator } from '@/components/student/mission/StepIndicator'
import { MissionPlanPanel } from '@/components/student/mission/MissionPlanPanel'
import {
  MISSION_STEP_ORDER,
  estimateMissionMinutes,
  type MissionStepKey,
} from '@/components/student/mission/mission-steps'
import { TrainingWalkthrough } from '@/components/student/mission/TrainingWalkthrough'
import { VocabPanel, type TermView } from '@/components/student/mission/VocabPanel'
import { ScenarioLab } from '@/components/student/mission/ScenarioLab'
import type { LessonStepView } from '@/components/student/mission/LessonStepRenderer'
import { AssessmentPreviewCard } from './AssessmentPreviewCard'

// Shared with the student flow so the preview cannot drift out of step with it —
// this used to be a hand-maintained copy of MissionFlow's order, and the two
// disagreed the moment a step was added.
const STEP_ORDER = MISSION_STEP_ORDER

type WalkStep = MissionStepKey

export interface WalkthroughData {
  benchmarkCode: string
  benchmarkTitle: string
  lessonTitle: string
  lessonBody: string
  studentFriendlyTarget: string
  lessonSteps: LessonStepView[]
  terms: TermView[]
  glossaryTerms: GlossaryTerm[]
  assessments: Record<PreviewAssessmentType, AssessmentPreview[]>
}

const STUDENT_EXPERIENCE: Record<PreviewAssessmentType, string> = {
  PRE_CHECK: 'Ungraded warm-up before training — students see a topic recap afterward.',
  VOCAB_CHECK: 'The Word Builder — students must complete it to leave the Key Terms step.',
  PRACTICE: 'Optional adaptive practice — difficulty adjusts, worked examples appear after struggles.',
  READINESS_CHECK: 'Graded gate — students must pass it before the Mastery Challenge unlocks.',
  MASTERY_CHALLENGE: 'The real thing — 80%+ masters the benchmark and unlocks the next mission.',
}

export function MissionWalkthrough({ data }: { data: WalkthroughData }) {
  const [currentStep, setCurrentStep] = useState<WalkStep>('plan')

  const stepIndex = STEP_ORDER.indexOf(currentStep)
  const trainingSteps = trainingStepsOf(data.lessonSteps)
  const vocabSteps = vocabStepsOf(data.lessonSteps)
  const scenarioSteps = scenarioStepsOf(data.lessonSteps)

  const go = (delta: number) => {
    const next = STEP_ORDER[stepIndex + delta]
    if (next) setCurrentStep(next)
  }

  const previewsFor = (type: PreviewAssessmentType) => data.assessments[type] ?? []

  return (
    <div className="space-y-4">
      {/* Preview banner: free navigation controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-indigo-200 bg-indigo-50 px-4 py-3">
        <p className="text-sm font-semibold text-indigo-900">
          <span className="mr-2 rounded-full bg-indigo-600 px-2 py-0.5 font-display text-xs font-bold uppercase tracking-wide text-white">
            Teacher preview
          </span>
          Exactly what students see — but nothing is gated, answers are revealed, and nothing
          is recorded. Click any step above to jump.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={stepIndex === 0}
            className="rounded-xl border-2 border-indigo-300 bg-white px-3 py-1.5 font-display text-sm font-bold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={stepIndex === STEP_ORDER.length - 1}
            className="rounded-xl border-2 border-indigo-700 bg-indigo-600 px-3 py-1.5 font-display text-sm font-bold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next step →
          </button>
        </div>
      </div>

      <StepIndicator
        currentStep={currentStep}
        completedSteps={STEP_ORDER.slice(0, stepIndex) as unknown as string[]}
        onStepClick={(key) => setCurrentStep(key as WalkStep)}
      />

      {currentStep === 'plan' && (
        <MissionPlanPanel
          target={data.studentFriendlyTarget}
          summary={null}
          estimatedMinutes={estimateMissionMinutes({
            trainingSteps: trainingSteps.length,
            vocabSteps: vocabSteps.length,
            scenarioSteps: scenarioSteps.length,
            assessmentCount: (
              ['PRE_CHECK', 'VOCAB_CHECK', 'PRACTICE', 'READINESS_CHECK', 'MASTERY_CHALLENGE'] as const
            ).filter((t) => previewsFor(t).length > 0).length,
          })}
          onStart={() => go(1)}
          ctaLabel="Next step"
        />
      )}

      {currentStep === 'pre-check' && (
        <PhasePanel title="Pre-Check" note="Students start here with an ungraded warm-up.">
          {previewsFor('PRE_CHECK').map((p) => (
            <AssessmentPreviewCard key={p.id} preview={p} studentExperience={STUDENT_EXPERIENCE.PRE_CHECK} />
          ))}
          {previewsFor('PRE_CHECK').length === 0 && <MissingPiece what="pre-check" />}
        </PhasePanel>
      )}

      {currentStep === 'briefing' && (
        <PhasePanel title="Mission Briefing" note="The big-picture setup students read first.">
          <p className="max-w-prose whitespace-pre-line text-base leading-7 text-gray-800">
            {data.lessonBody}
          </p>
          <p className="max-w-prose rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-900">
            Learning target: {data.studentFriendlyTarget}
          </p>
        </PhasePanel>
      )}

      {currentStep === 'vocab' && (
        <div className="space-y-3">
          {/* vocabCheckAssessmentId=null keeps Continue ungated and keeps the
              real Word Builder player (which would record an attempt) out. */}
          <VocabPanel
            terms={data.terms}
            vocabSteps={vocabSteps}
            vocabCheckAssessmentId={null}
            onContinue={() => go(1)}
          />
          {previewsFor('VOCAB_CHECK').map((p) => (
            <AssessmentPreviewCard key={p.id} preview={p} studentExperience={STUDENT_EXPERIENCE.VOCAB_CHECK} />
          ))}
        </div>
      )}

      {currentStep === 'training' && (
        <TrainingWalkthrough
          steps={trainingSteps}
          onComplete={() => go(1)}
          glossaryTerms={data.glossaryTerms}
          ungated
          revealAnswers
        />
      )}

      {currentStep === 'scenario-lab' && (
        <ScenarioLab steps={scenarioSteps} onComplete={() => go(1)} ungated revealAnswers />
      )}

      {currentStep === 'practice' && (
        <PhasePanel
          title="Practice Arena"
          note="Optional for students — adaptive difficulty with worked examples after struggle streaks. These questions rotate; the pool below is the fixed practice set."
        >
          {previewsFor('PRACTICE').map((p) => (
            <AssessmentPreviewCard key={p.id} preview={p} studentExperience={STUDENT_EXPERIENCE.PRACTICE} />
          ))}
          {previewsFor('PRACTICE').length === 0 && <MissingPiece what="practice set" />}
        </PhasePanel>
      )}

      {currentStep === 'readiness-check' && (
        <PhasePanel title="Readiness Check" note="Passing this unlocks the Mastery Challenge.">
          {previewsFor('READINESS_CHECK').map((p) => (
            <AssessmentPreviewCard key={p.id} preview={p} studentExperience={STUDENT_EXPERIENCE.READINESS_CHECK} />
          ))}
          {previewsFor('READINESS_CHECK').length === 0 && <MissingPiece what="readiness check" />}
        </PhasePanel>
      )}

      {currentStep === 'mastery-challenge' && (
        <PhasePanel
          title="Mastery Challenge"
          note="Students are served one form per attempt, rotating — all forms shown here."
        >
          {previewsFor('MASTERY_CHALLENGE').map((p) => (
            <AssessmentPreviewCard key={p.id} preview={p} studentExperience={STUDENT_EXPERIENCE.MASTERY_CHALLENGE} />
          ))}
          {previewsFor('MASTERY_CHALLENGE').length === 0 && <MissingPiece what="mastery challenge" />}
          <div className="pt-1">
            <Link
              href={`/teacher/lessons/${data.benchmarkCode}`}
              className="text-sm font-semibold text-indigo-600 hover:underline"
            >
              Done — back to the manage view →
            </Link>
          </div>
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
  children: ReactNode
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

function MissingPiece({ what }: { what: string }) {
  return (
    <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
      No approved {what} exists for this benchmark yet — students skip straight past this step.
    </p>
  )
}
