'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { trainingStepsOf, vocabStepsOf, scenarioStepsOf } from '@/lib/lesson-content'
import type { GlossaryTerm } from '@/lib/reading-load'
import { StepIndicator } from './StepIndicator'
import { AssessmentPlayer } from '@/components/student/assessment/AssessmentPlayer'
import { Mascot } from '@/components/ui/Mascot'
import { TrackIcon, type TrackIconName } from '@/components/ui/TrackIcon'
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
  /** DB-derived resume: readiness already passed / benchmark mastered. */
  derivedResumeStep: 'mastery-challenge' | null
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
  // Topic labels of pre-check misses → "here's what this mission will teach you".
  const [preCheckTopics, setPreCheckTopics] = useState<string[] | null>(null)
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
    // DB truth outranks the training-step pointer: a student who already
    // passed the Readiness Check (or mastered) resumes at the Mastery
    // Challenge on a fresh device instead of being dumped back into training.
    if (mission.derivedResumeStep) {
      const idx = STEP_ORDER.indexOf(mission.derivedResumeStep)
      setCurrentStep(mission.derivedResumeStep)
      setCompletedSteps(STEP_ORDER.slice(0, idx) as Step[])
      return
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
          <div className="space-y-4 rounded-2xl border-2 border-indigo-100 bg-white p-5 shadow-card">
            <StepHeader icon="search" title="Mission Pre-Check">
              A few quick questions to see what you already know — this does NOT count toward
              your score. It&apos;s just scouting!
            </StepHeader>
            <AssessmentPlayer
              assessmentId={mission.preCheckAssessmentId}
              onComplete={(r) => {
                setPreCheckDone(true)
                setPreCheckTopics(r.reviewTopics ?? null)
              }}
            />
            {preCheckDone && (
              <div className="space-y-3 rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4 animate-pop-in">
                <div className="flex items-start gap-3">
                  <Mascot pose="pointing" className="h-14 w-14 flex-shrink-0" />
                  {preCheckTopics && preCheckTopics.length > 0 ? (
                    <div className="pt-1">
                      <p className="text-base font-semibold text-indigo-950">
                        Scouting report: here&apos;s what this mission will teach you.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {preCheckTopics.map((topic) => (
                          <span
                            key={topic}
                            className="rounded-full border border-indigo-300 bg-white px-2.5 py-0.5 text-sm font-semibold text-indigo-900"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="pt-1 text-base font-semibold text-indigo-950">
                      Scouting report: you already know some of this ground — the training will
                      sharpen it and take you further.
                    </p>
                  )}
                </div>
                <button
                  onClick={() => completeStep('pre-check')}
                  className="rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-5 py-2 font-display text-sm font-bold text-white transition-colors hover:bg-indigo-500 active:translate-y-[3px] active:border-b-0"
                >
                  Continue to Briefing →
                </button>
              </div>
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
          <div className="space-y-4 rounded-2xl border-2 border-amber-200 bg-white p-5 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <StepHeader icon="bolt" title="Practice Arena" tone="amber">
                Warm up before the Readiness Check. Miss a few in a row and I&apos;ll walk one
                through with you — that&apos;s the point of practice.
              </StepHeader>
              <button
                type="button"
                onClick={() => completeStep('practice')}
                className="flex-shrink-0 text-sm font-semibold text-gray-600 underline hover:text-indigo-700"
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
          <div className="space-y-4 rounded-2xl border-2 border-indigo-100 bg-white p-5 shadow-card">
            <StepHeader icon="target" title="Readiness Check">
              A short quiz to see if you&apos;re ready. Score 70% or higher to unlock the Mastery
              Challenge.
            </StepHeader>
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
                className="rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-5 py-2 font-display text-sm font-bold text-white transition-colors hover:bg-indigo-500 active:translate-y-[3px] active:border-b-0"
              >
                Unlock Mastery Challenge →
              </button>
            )}
            {readinessResult && !readinessResult.passed && (
              <div className="space-y-3 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 animate-pop-in">
                <div className="flex items-start gap-3">
                  <Mascot pose="pointing" className="h-14 w-14 flex-shrink-0" />
                  <p className="pt-1 text-base font-semibold text-amber-900">
                    Not quite there yet — that&apos;s exactly what the Readiness Check is for.
                  </p>
                </div>
                {readinessResult.reviewTopics && readinessResult.reviewTopics.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-white p-3">
                    <p className="mb-1.5 font-display text-xs font-bold uppercase tracking-widest text-amber-700">
                      Worth another look
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {readinessResult.reviewTopics.map((topic) => (
                        <span
                          key={topic}
                          className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-sm font-semibold text-amber-900"
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
                    className="rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-4 py-2 font-display text-sm font-bold text-white transition-colors hover:bg-indigo-500 active:translate-y-[3px] active:border-b-0"
                  >
                    Review the Training
                  </button>
                  {mission.practiceAssessmentId && (
                    <button
                      onClick={() => jumpToReview('practice')}
                      className="rounded-2xl border-2 border-b-4 border-indigo-300 bg-white px-4 py-2 font-display text-sm font-bold text-indigo-700 transition-colors hover:bg-indigo-50 active:translate-y-[2px] active:border-b-2"
                    >
                      Warm up in the Practice Arena
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setReadinessResult(null)
                      setReadinessAttempt((n) => n + 1)
                    }}
                    className="rounded-2xl border-2 border-b-4 border-gray-300 bg-white px-4 py-2 font-display text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 active:translate-y-[2px] active:border-b-2"
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
        <div className="relative space-y-4 overflow-hidden rounded-3xl border-b-4 border-indigo-950 bg-gradient-to-br from-indigo-700 to-indigo-900 p-8 text-center text-white">
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute -left-8 -top-10 h-44 w-44 text-white/10"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 3l7.5 3v5.5c0 5-3.7 8.3-7.5 10.5-3.8-2.2-7.5-5.5-7.5-10.5V6L12 3z" />
          </svg>
          <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
            <TrackIcon name="shield" className="h-9 w-9" strokeWidth={1.8} />
          </span>
          <h2 className="relative font-display text-2xl font-bold">Mastery Challenge</h2>
          <p className="relative mx-auto max-w-md text-base leading-relaxed text-indigo-100">
            This is the final assessment. You need 80% or higher to master this benchmark and unlock the next mission.
            Confidence ratings are required.
          </p>
          {mission.assessmentId ? (
            <Link
              href={`/student/assessment/${mission.assessmentId}`}
              className="relative inline-block rounded-2xl border-b-4 border-amber-600 bg-amber-400 px-7 py-3 font-display text-base font-bold text-amber-950 transition-colors hover:bg-amber-300 active:translate-y-[3px] active:border-b-0"
            >
              Begin Mastery Challenge →
            </Link>
          ) : (
            <p className="relative text-base text-amber-200">Assessment not yet available for this benchmark.</p>
          )}
        </div>
      )}
    </div>
  )
}

function StepHeader({
  icon,
  title,
  tone = 'indigo',
  children,
}: {
  icon: TrackIconName
  title: string
  tone?: 'indigo' | 'amber'
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
          tone === 'amber' ? 'bg-amber-400 text-amber-950' : 'bg-indigo-600 text-white'
        }`}
      >
        <TrackIcon name={icon} className="h-5 w-5" />
      </span>
      <div>
        <h2 className="font-display text-xl font-bold text-gray-900">{title}</h2>
        <p className="text-base text-gray-600">{children}</p>
      </div>
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
    <div className="space-y-4 rounded-2xl border-2 border-indigo-100 bg-white p-6 shadow-card">
      <h2 className="font-display text-xl font-bold text-gray-900">{title}</h2>
      <div className="max-w-prose whitespace-pre-line text-base leading-7 text-gray-800">{description}</div>
      <button
        onClick={onContinue}
        className="rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-5 py-2 font-display text-sm font-bold text-white transition-colors hover:bg-indigo-500 active:translate-y-[3px] active:border-b-0"
      >
        {ctaLabel}
      </button>
    </div>
  )
}
