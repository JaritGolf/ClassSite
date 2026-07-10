'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { trainingStepsOf, vocabStepsOf, scenarioStepsOf } from '@/lib/lesson-content'
import type { GlossaryTerm } from '@/lib/reading-load'
import { StepIndicator } from './StepIndicator'
import { AssessmentPlayer } from '@/components/student/assessment/AssessmentPlayer'
import { TrainingWalkthrough } from './TrainingWalkthrough'
import { VocabPanel, type TermView } from './VocabPanel'
import { ScenarioLab } from './ScenarioLab'
import { PracticeArena } from './PracticeArena'
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

type Step = typeof STEP_ORDER[number]

interface MissionData {
  benchmarkCode: string
  benchmarkTitle: string
  lessonSummary: string | null
  /** Lesson.body — the authored Mission Briefing text (ADR 0013). */
  lessonBody: string | null
  studentFriendlyTarget: string
  preCheckAssessmentId: string | null
  readinessAssessmentId: string | null
  assessmentId: string | null
  practiceAssessmentId: string | null
  vocabCheckAssessmentId: string | null
  lessonSteps: LessonStepView[]
  terms: TermView[]
  /** Tier-2 (global) + tier-3 (benchmark) terms for note glossary popovers. */
  glossaryTerms: GlossaryTerm[]
  /** Server-side resume point (StudentProgress.currentStepId), if any. */
  resumeStepId: string | null
  /** Scopes device-local resume state to this student (shared Chromebooks). */
  progressKey: string
}

interface SavedFlowState {
  v: 1
  step: Step
  completed: Step[]
  trainingIndex: number
}

function flowStorageKey(progressKey: string, benchmarkCode: string): string {
  return `cq:mission:${progressKey}:${benchmarkCode}`
}

interface MissionFlowProps {
  mission: MissionData
}

export function MissionFlow({ mission }: MissionFlowProps) {
  const [currentStep, setCurrentStep] = useState<Step>('pre-check')
  const [completedSteps, setCompletedSteps] = useState<Step[]>([])
  const [preCheckDone, setPreCheckDone] = useState(false)
  const [readinessResult, setReadinessResult] = useState<{
    passed: boolean
    reviewTopics?: string[] | null
  } | null>(null)
  const [readinessAttempt, setReadinessAttempt] = useState(0)
  // Set when the student jumps back from a failed readiness check — completing
  // the review returns them to the readiness check instead of marching forward.
  const [reviewingFrom, setReviewingFrom] = useState<Step | null>(null)
  const [trainingIndex, setTrainingIndex] = useState(0)
  const hydrated = useRef(false)

  const trainingSteps = trainingStepsOf(mission.lessonSteps)
  const vocabSteps = vocabStepsOf(mission.lessonSteps)
  const scenarioSteps = scenarioStepsOf(mission.lessonSteps)

  // ── Resume (spec §21.3 "continue from last saved step") ──────────────────
  // Device-local flow state first; else the server-side training step pointer.
  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    try {
      const raw = localStorage.getItem(flowStorageKey(mission.progressKey, mission.benchmarkCode))
      if (raw) {
        const saved = JSON.parse(raw) as SavedFlowState
        if (saved.v === 1 && (STEP_ORDER as readonly string[]).includes(saved.step)) {
          setCurrentStep(saved.step)
          setCompletedSteps(saved.completed.filter((s) => (STEP_ORDER as readonly string[]).includes(s)))
          setTrainingIndex(Math.min(Math.max(0, saved.trainingIndex), Math.max(0, trainingSteps.length - 1)))
          return
        }
      }
    } catch {
      /* localStorage unavailable — fall through */
    }
    if (mission.resumeStepId) {
      const idx = trainingSteps.findIndex((s) => s.id === mission.resumeStepId)
      if (idx >= 0) {
        setCurrentStep('training')
        setCompletedSteps(['pre-check', 'briefing', 'vocab'])
        setTrainingIndex(idx)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist flow state so a student can leave mid-mission and pick up here.
  useEffect(() => {
    if (!hydrated.current) return
    try {
      const state: SavedFlowState = {
        v: 1,
        step: currentStep,
        completed: completedSteps,
        trainingIndex,
      }
      localStorage.setItem(
        flowStorageKey(mission.progressKey, mission.benchmarkCode),
        JSON.stringify(state)
      )
    } catch {
      /* non-fatal */
    }
  }, [currentStep, completedSteps, trainingIndex, mission.progressKey, mission.benchmarkCode])

  function handleTrainingIndexChange(index: number, stepId: string) {
    setTrainingIndex(index)
    // Cross-device resume point — fire and forget; purely display/resume data.
    fetch('/api/mission/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ benchmarkCode: mission.benchmarkCode, stepId }),
    }).catch(() => {})
  }

  function completeStep(step: Step) {
    setCompletedSteps((prev) => (prev.includes(step) ? prev : [...prev, step]))
    if (reviewingFrom) {
      setCurrentStep(reviewingFrom)
      setReviewingFrom(null)
      return
    }
    const nextIndex = STEP_ORDER.indexOf(step) + 1
    if (nextIndex < STEP_ORDER.length) {
      setCurrentStep(STEP_ORDER[nextIndex])
    }
  }

  function jumpToReview(step: Step) {
    setReviewingFrom('readiness-check')
    setReadinessResult(null)
    setReadinessAttempt((n) => n + 1)
    setCurrentStep(step)
  }

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
          description={mission.lessonBody ?? mission.lessonSummary ?? mission.studentFriendlyTarget}
          onContinue={() => completeStep('briefing')}
          ctaLabel="Got it — Let's Train!"
        />
      )}

      {currentStep === 'vocab' && (
        <VocabPanel
          terms={mission.terms}
          vocabSteps={vocabSteps}
          vocabCheckAssessmentId={mission.vocabCheckAssessmentId}
          onContinue={() => completeStep('vocab')}
        />
      )}

      {currentStep === 'training' &&
        (trainingSteps.length > 0 ? (
          <TrainingWalkthrough
            steps={trainingSteps}
            glossaryTerms={mission.glossaryTerms}
            initialIndex={trainingIndex}
            onIndexChange={handleTrainingIndexChange}
            onComplete={() => completeStep('training')}
          />
        ) : (
          <StepPanel
            title="Guided Training"
            description="Work through the guided lesson content for this benchmark."
            onContinue={() => completeStep('training')}
            ctaLabel="Training Complete"
          />
        ))}

      {currentStep === 'scenario-lab' &&
        (scenarioSteps.length > 0 ? (
          <ScenarioLab steps={scenarioSteps} onComplete={() => completeStep('scenario-lab')} />
        ) : (
          <StepPanel
            title="Scenario Lab"
            description="Apply what you've learned to a real civic scenario or source document."
            onContinue={() => completeStep('scenario-lab')}
            ctaLabel="Scenario Complete"
          />
        ))}

      {currentStep === 'practice' &&
        (mission.practiceAssessmentId ? (
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Practice Arena</h2>
                <p className="text-sm text-gray-600">
                  Warm up before the Readiness Check. Miss a few in a row and I&apos;ll walk one
                  through with you — that&apos;s the point of practice.
                </p>
              </div>
              <button
                type="button"
                onClick={() => completeStep('practice')}
                className="flex-shrink-0 text-xs font-medium text-gray-600 hover:text-indigo-700 underline"
              >
                Skip practice
              </button>
            </div>
            <PracticeArena
              key={readinessAttempt}
              assessmentId={mission.practiceAssessmentId}
              onFinish={() => completeStep('practice')}
            />
          </div>
        ) : (
          <StepPanel
            title="Practice Arena"
            description="No practice set is available for this benchmark yet — head straight to the Readiness Check."
            onContinue={() => completeStep('practice')}
            ctaLabel="Continue"
          />
        ))}

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
              onComplete={(r) =>
                setReadinessResult({ passed: r.passed, reviewTopics: r.reviewTopics ?? null })
              }
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
              <div className="space-y-3">
                <p className="text-sm text-amber-700">
                  Not quite there yet — that&apos;s what the Readiness Check is for.
                </p>
                {readinessResult.reviewTopics && readinessResult.reviewTopics.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1.5">
                      Worth another look
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {readinessResult.reviewTopics.map((topic) => (
                        <span
                          key={topic}
                          className="rounded-full bg-white border border-amber-300 px-2.5 py-0.5 text-xs font-medium text-amber-900"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => jumpToReview('training')}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                  >
                    Review the Training
                  </button>
                  {mission.practiceAssessmentId && (
                    <button
                      onClick={() => jumpToReview('practice')}
                      className="rounded-lg border border-indigo-300 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors"
                    >
                      Warm up in the Practice Arena
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setReadinessResult(null)
                      setReadinessAttempt((n) => n + 1)
                    }}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
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
