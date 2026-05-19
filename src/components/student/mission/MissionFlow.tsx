'use client'

import { useState } from 'react'
import Link from 'next/link'
import { StepIndicator } from './StepIndicator'

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
  assessmentId: string | null
  lessonSteps: LessonStep[]
}

interface MissionFlowProps {
  mission: MissionData
}

export function MissionFlow({ mission }: MissionFlowProps) {
  const [currentStep, setCurrentStep] = useState<Step>('pre-check')
  const [completedSteps, setCompletedSteps] = useState<Step[]>([])

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

      {currentStep === 'pre-check' && (
        <StepPanel
          title="Mission Pre-Check"
          description="Answer 2–3 quick questions to help us understand what you already know. This does NOT count toward your score — it's just scouting!"
          onContinue={() => completeStep('pre-check')}
          ctaLabel="Start Pre-Check"
        />
      )}

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

      {currentStep === 'readiness-check' && (
        <StepPanel
          title="Readiness Check"
          description="Short formative quiz to see if you're ready for the Mastery Challenge. Pass this to unlock the final assessment."
          onContinue={() => completeStep('readiness-check')}
          ctaLabel="Take Readiness Check"
        />
      )}

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
