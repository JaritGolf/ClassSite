'use client'

import { useState } from 'react'
import Link from 'next/link'
import { StepIndicator } from './StepIndicator'
import { AssessmentPlayer } from '@/components/student/assessment/AssessmentPlayer'

const STEP_ORDER = [
  'pre-check',
  'briefing',
  'vocab',
  'training',
  'scenario-lab',
  'readiness-check',
  'mastery-challenge',
] as const

type Step = typeof STEP_ORDER[number]

interface LessonStep {
  id: string
  stepType: string
  title: string
  content: string
  sequenceOrder: number
  required: boolean
}

interface MissionData {
  benchmarkCode: string
  benchmarkTitle: string
  lessonSummary: string | null
  studentFriendlyTarget: string
  preCheckAssessmentId: string | null
  readinessAssessmentId: string | null
  assessmentId: string | null
  lessonSteps: LessonStep[]
}

interface MissionFlowProps {
  mission: MissionData
}

export function MissionFlow({ mission }: MissionFlowProps) {
  const [currentStep, setCurrentStep] = useState<Step>('pre-check')
  const [completedSteps, setCompletedSteps] = useState<Step[]>([])
  const [preCheckDone, setPreCheckDone] = useState(false)
  const [readinessResult, setReadinessResult] = useState<{ passed: boolean } | null>(null)
  const [readinessAttempt, setReadinessAttempt] = useState(0)

  function completeStep(step: Step) {
    setCompletedSteps((prev) => (prev.includes(step) ? prev : [...prev, step]))
    const nextIndex = STEP_ORDER.indexOf(step) + 1
    if (nextIndex < STEP_ORDER.length) {
      setCurrentStep(STEP_ORDER[nextIndex])
    }
  }

  const trainingSteps = mission.lessonSteps.filter((s) =>
    ['VIDEO', 'NOTE', 'INTERACTIVE_CHECK', 'WORKED_EXAMPLE'].includes(s.stepType)
  )
  const vocabSteps = mission.lessonSteps.filter((s) => s.stepType === 'VOCABULARY')
  const scenarioSteps = mission.lessonSteps.filter((s) => s.stepType === 'SOURCE_ANALYSIS')

  return (
    <div className="space-y-6">
      <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />

      {currentStep === 'pre-check' &&
        (mission.preCheckAssessmentId ? (
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Mission Pre-Check</h2>
              <p className="text-sm text-gray-600">
                A few quick questions to see what you already know — this does NOT count toward
                your score. It&apos;s just scouting!
              </p>
            </div>
            <AssessmentPlayer
              assessmentId={mission.preCheckAssessmentId}
              onComplete={() => setPreCheckDone(true)}
            />
            {preCheckDone && (
              <button
                onClick={() => completeStep('pre-check')}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                Continue to Briefing →
              </button>
            )}
          </div>
        ) : (
          <StepPanel
            title="Mission Pre-Check"
            description="Answer a few quick questions to help us understand what you already know. This does NOT count toward your score — it's just scouting!"
            onContinue={() => completeStep('pre-check')}
            ctaLabel="Skip Pre-Check"
          />
        ))}

      {currentStep === 'briefing' && (
        <StepPanel
          title="Mission Briefing"
          description={mission.lessonSummary ?? mission.studentFriendlyTarget}
          onContinue={() => completeStep('briefing')}
          ctaLabel="Got it — Let's Train!"
        />
      )}

      {currentStep === 'vocab' && (
        <StepPanel
          title="Key Terms Unlock"
          description={
            vocabSteps.length > 0
              ? vocabSteps.map((s) => s.content).join('\n\n')
              : 'Review the key terms for this benchmark before diving into training.'
          }
          onContinue={() => completeStep('vocab')}
          ctaLabel="Terms Unlocked — Continue"
        />
      )}

      {currentStep === 'training' && (
        <StepPanel
          title="Guided Training"
          description={
            trainingSteps.length > 0
              ? trainingSteps[0].content
              : 'Work through the guided lesson content for this benchmark.'
          }
          onContinue={() => completeStep('training')}
          ctaLabel="Training Complete"
        />
      )}

      {currentStep === 'scenario-lab' && (
        <StepPanel
          title="Scenario Lab"
          description={
            scenarioSteps.length > 0
              ? scenarioSteps[0].content
              : 'Apply what you\'ve learned to a real civic scenario or source document.'
          }
          onContinue={() => completeStep('scenario-lab')}
          ctaLabel="Scenario Complete"
        />
      )}

      {currentStep === 'readiness-check' &&
        (mission.readinessAssessmentId ? (
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Readiness Check</h2>
              <p className="text-sm text-gray-600">
                A short quiz to see if you&apos;re ready. Score 70% or higher to unlock the Mastery
                Challenge.
              </p>
            </div>
            <AssessmentPlayer
              key={readinessAttempt}
              assessmentId={mission.readinessAssessmentId}
              onComplete={(r) => setReadinessResult({ passed: r.passed })}
            />
            {readinessResult?.passed && (
              <button
                onClick={() => completeStep('readiness-check')}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                Unlock Mastery Challenge →
              </button>
            )}
            {readinessResult && !readinessResult.passed && (
              <div className="space-y-2">
                <p className="text-sm text-amber-700">
                  Not quite — review the training and try the readiness check again.
                </p>
                <button
                  onClick={() => {
                    setReadinessResult(null)
                    setReadinessAttempt((n) => n + 1)
                  }}
                  className="rounded-lg border border-indigo-300 px-5 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        ) : (
          <StepPanel
            title="Readiness Check"
            description="Short formative quiz to see if you're ready for the Mastery Challenge."
            onContinue={() => completeStep('readiness-check')}
            ctaLabel="Continue"
          />
        ))}

      {currentStep === 'mastery-challenge' && (
        <div className="rounded-xl border-2 border-indigo-300 bg-indigo-50 p-6 space-y-4 text-center">
          <h2 className="text-xl font-bold text-indigo-800">Mastery Challenge</h2>
          <p className="text-indigo-700 text-sm">
            This is the final assessment. You need 80% or higher to master this benchmark and unlock the next mission.
            Confidence ratings are required.
          </p>
          {mission.assessmentId ? (
            <Link
              href={`/student/assessment/${mission.assessmentId}`}
              className="inline-block rounded-lg bg-indigo-600 px-6 py-2.5 text-white font-semibold hover:bg-indigo-700 transition-colors"
            >
              Begin Mastery Challenge →
            </Link>
          ) : (
            <p className="text-amber-600 text-sm">Assessment not yet available for this benchmark.</p>
          )}
        </div>
      )}
    </div>
  )
}

function StepPanel({
  title,
  description,
  onContinue,
  ctaLabel,
}: {
  title: string
  description: string
  onContinue: () => void
  ctaLabel: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{description}</div>
      <button
        onClick={onContinue}
        className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
      >
        {ctaLabel}
      </button>
    </div>
  )
}
