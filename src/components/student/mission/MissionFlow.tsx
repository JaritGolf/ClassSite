'use client'

import { useEffect, useRef, useState } from 'react'
import {
  trainingStepsOf,
  vocabStepsOf,
  scenarioStepsOf,
  withResumeAnchors,
  type ResolvedStep,
} from '@/lib/lesson-content'
import type { GlossaryTerm } from '@/lib/reading-load'
import { StepIndicator } from './StepIndicator'
import { StepContextBar } from './StepContextBar'
import { MissionPlanPanel } from './MissionPlanPanel'
import { MISSION_STEP_ORDER, estimateMissionMinutes,
  countExtraBlocks, type MissionStepKey } from './mission-steps'
import { AssessmentPlayer } from '@/components/student/assessment/AssessmentPlayer'
import { NextStepHandoff } from '@/components/student/NextStepHandoff'
import { Mascot } from '@/components/ui/Mascot'
import { TrackIcon, type TrackIconName } from '@/components/ui/TrackIcon'
import { TrainingWalkthrough } from './TrainingWalkthrough'
import { VocabPanel, type TermView } from './VocabPanel'
import { ScenarioLab } from './ScenarioLab'
import { PracticeArena } from './PracticeArena'
import { useLocalProgress } from '@/lib/local-progress/useLocalProgress'
import {
  markMissionOpened,
  pickMasteryForm,
  recordMasteryAttempt,
  recordReadinessPassed,
  saveMissionFlow,
  setLastActivity,
  type MasteryOutcome,
} from '@/lib/local-progress/engine'
import { missionLabel } from '@/lib/student-next-step'
import { CompletionCodeCard } from './CompletionCodeCard'

/**
 * The mission arc.
 *
 * Step order, labels and explainers now come from `mission-steps.ts` — they used
 * to be duplicated here and in StepIndicator, which could silently drift.
 *
 * Two guidance changes beyond that:
 *   - A `plan` step opens the mission. Students used to land straight in an
 *     ungraded quiz with no statement of what the mission covered or how long it
 *     would take.
 *   - The Mastery Challenge is taken HERE instead of navigating out to
 *     `/student/assessment/[id]`, so the mission's context survives to the moment
 *     of completion and can hand the student their next step.
 */

type Step = MissionStepKey

export interface MissionData {
  benchmarkCode: string
  benchmarkTitle: string
  lessonSummary: string | null
  /** Lesson.body — the authored Mission Briefing text (ADR 0013). */
  lessonBody: string | null
  studentFriendlyTarget: string
  preCheckAssessmentId: string | null
  readinessAssessmentId: string | null
  /** Rotating Mastery Challenge forms, in a stable order. */
  masteryFormIds: string[]
  practiceAssessmentId: string | null
  vocabCheckAssessmentId: string | null
  /**
   * Resolved for the published class: teacher content overrides applied,
   * hidden modules dropped, teacher-added modules spliced in, in order.
   */
  lessonSteps: ResolvedStep[]
  terms: TermView[]
  /** Tier-2 (global) + tier-3 (benchmark) terms for note glossary popovers. */
  glossaryTerms: GlossaryTerm[]
}

interface MissionFlowProps {
  mission: MissionData
}

export function MissionFlow({ mission }: MissionFlowProps) {
  const { progress, hydrated: storeReady, update } = useLocalProgress()
  const code = mission.benchmarkCode
  const record = progress.missions[code]

  const [currentStep, setCurrentStep] = useState<Step>('plan')
  const [completedSteps, setCompletedSteps] = useState<Step[]>([])
  const [preCheckDone, setPreCheckDone] = useState(false)
  // Topic labels of pre-check misses → "here's what this mission will teach you".
  const [preCheckTopics, setPreCheckTopics] = useState<string[] | null>(null)
  const [readinessResult, setReadinessResult] = useState<{
    passed: boolean
    reviewTopics?: string[] | null
  } | null>(null)
  const [readinessAttempt, setReadinessAttempt] = useState(0)
  // Mastery Challenge, taken in place. The form is chosen once, when the
  // student presses Begin, so recording the attempt cannot swap the questions
  // out from under them mid-challenge.
  const [masteryFormId, setMasteryFormId] = useState<string | null>(null)
  const [masteryResult, setMasteryResult] = useState<{
    passed: boolean
    outcome: MasteryOutcome
    completionCode: string | null
  } | null>(null)
  // Set when the student jumps back from a failed readiness check — completing
  // the review returns them to the readiness check instead of marching forward.
  const [reviewingFrom, setReviewingFrom] = useState<Step | null>(null)
  const [trainingIndex, setTrainingIndex] = useState(0)
  const hydrated = useRef(false)

  // Anchors are attached AFTER bucketing, never before: the pointer is looked
  // up with trainingSteps.findIndex below, so an anchor taken from the whole
  // lesson could name a step that isn't in this bucket, resolve to -1, and
  // silently restart the student's training.
  const trainingSteps = withResumeAnchors(trainingStepsOf(mission.lessonSteps))
  const vocabSteps = vocabStepsOf(mission.lessonSteps)
  const scenarioSteps = scenarioStepsOf(mission.lessonSteps)

  // ── Resume (spec §21.3 "continue from last saved step") ──────────────────
  // Everything comes from this device's saved progress. Saved steps are
  // validated by membership, not by index, so adding a step to the order never
  // strands a student mid-mission.
  useEffect(() => {
    if (!storeReady || hydrated.current) return
    hydrated.current = true

    update((p) =>
      setLastActivity(
        markMissionOpened(p, code),
        {
          label: missionLabel(code, mission.benchmarkTitle),
          subLabel: 'Pick up where you left off',
          href: `/student/mission/${code}`,
          icon: 'sparkle',
        },
        new Date()
      )
    )

    const saved = record?.flow
    if (saved && (MISSION_STEP_ORDER as readonly string[]).includes(saved.step)) {
      setCurrentStep(saved.step as Step)
      setCompletedSteps(
        saved.completed.filter((s) => (MISSION_STEP_ORDER as readonly string[]).includes(s)) as Step[]
      )
      // Prefer the saved step id — it survives a teacher inserting a module
      // ahead of this student. Fall back to the index if that step is gone.
      const byId = saved.trainingStepId
        ? trainingSteps.findIndex((s) => s.id === saved.trainingStepId)
        : -1
      setTrainingIndex(
        byId >= 0
          ? byId
          : Math.min(Math.max(0, saved.trainingIndex), Math.max(0, trainingSteps.length - 1))
      )
      return
    }
    // No saved place (e.g. progress loaded from a file made before this
    // mission was opened), but the Readiness Check is already passed: resume
    // at the Mastery Challenge instead of sending the student back to training.
    if (record?.readinessPassedAt) {
      const idx = MISSION_STEP_ORDER.indexOf('mastery-challenge')
      setCurrentStep('mastery-challenge')
      setCompletedSteps(MISSION_STEP_ORDER.slice(0, idx) as Step[])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeReady])

  // Persist flow state so a student can leave mid-mission and pick up here.
  useEffect(() => {
    if (!hydrated.current) return
    update((p) =>
      saveMissionFlow(p, code, {
        step: currentStep,
        completed: completedSteps,
        trainingIndex,
        trainingStepId: trainingSteps[trainingIndex]?.id,
      })
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, completedSteps, trainingIndex, code])

  function handleTrainingIndexChange(index: number, _stepId: string) {
    setTrainingIndex(index)
  }

  function completeStep(step: Step) {
    setCompletedSteps((prev) => (prev.includes(step) ? prev : [...prev, step]))
    if (reviewingFrom) {
      setCurrentStep(reviewingFrom)
      setReviewingFrom(null)
      return
    }
    const nextIndex = MISSION_STEP_ORDER.indexOf(step) + 1
    if (nextIndex < MISSION_STEP_ORDER.length) {
      setCurrentStep(MISSION_STEP_ORDER[nextIndex])
    }
  }

  function jumpToReview(step: Step) {
    setReviewingFrom('readiness-check')
    setReadinessResult(null)
    setReadinessAttempt((n) => n + 1)
    setCurrentStep(step)
  }

  const assessmentCount = [
    mission.preCheckAssessmentId,
    mission.vocabCheckAssessmentId,
    mission.practiceAssessmentId,
    mission.readinessAssessmentId,
    mission.masteryFormIds[0] ?? null,
  ].filter(Boolean).length

  if (!storeReady) {
    return <p className="py-12 text-center text-base text-gray-600">Loading your mission…</p>
  }

  return (
    <div className="space-y-6">
      <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />

      {currentStep === 'plan' && (
        <MissionPlanPanel
          target={mission.studentFriendlyTarget}
          summary={mission.lessonSummary}
          estimatedMinutes={estimateMissionMinutes({
            trainingSteps: trainingSteps.length,
            vocabSteps: vocabSteps.length,
            scenarioSteps: scenarioSteps.length,
            assessmentCount,
            extraTrainingBlocks: countExtraBlocks(trainingSteps),
          })}
          onStart={() => completeStep('plan')}
        />
      )}

      {currentStep === 'pre-check' &&
        (mission.preCheckAssessmentId ? (
          <div className="space-y-4 rounded-2xl border-2 border-indigo-100 bg-white p-5 shadow-card">
            <StepContextBar stepKey="pre-check" />
            <StepHeader icon="search" title="Mission Pre-Check">
              Answer what you can and guess where you need to — either way it tells us where to
              start.
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
            stepKey="pre-check"
            title="Mission Pre-Check"
            description="There's no pre-check for this mission — head straight to the briefing."
            onContinue={() => completeStep('pre-check')}
            ctaLabel="Skip Pre-Check"
          />
        ))}

      {currentStep === 'briefing' && (
        <StepPanel
          stepKey="briefing"
          title="Mission Briefing"
          description={mission.lessonBody ?? mission.lessonSummary ?? mission.studentFriendlyTarget}
          onContinue={() => completeStep('briefing')}
          ctaLabel="Got it — Let's Train!"
        />
      )}

      {currentStep === 'vocab' && (
        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-indigo-100 bg-white p-5 shadow-card">
            <StepContextBar stepKey="vocab" />
          </div>
          <VocabPanel
            terms={mission.terms}
            vocabSteps={vocabSteps}
            vocabCheckAssessmentId={mission.vocabCheckAssessmentId}
            onContinue={() => completeStep('vocab')}
          />
        </div>
      )}

      {currentStep === 'training' &&
        (trainingSteps.length > 0 ? (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-indigo-100 bg-white p-5 shadow-card">
              <StepContextBar stepKey="training" />
            </div>
            <TrainingWalkthrough
              steps={trainingSteps}
              glossaryTerms={mission.glossaryTerms}
              initialIndex={trainingIndex}
              onIndexChange={handleTrainingIndexChange}
              onComplete={() => completeStep('training')}
            />
          </div>
        ) : (
          <StepPanel
            stepKey="training"
            title="Guided Training"
            description="Work through the guided lesson content for this benchmark."
            onContinue={() => completeStep('training')}
            ctaLabel="Training Complete"
          />
        ))}

      {currentStep === 'scenario-lab' &&
        (scenarioSteps.length > 0 ? (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-indigo-100 bg-white p-5 shadow-card">
              <StepContextBar stepKey="scenario-lab" />
            </div>
            <ScenarioLab steps={scenarioSteps} onComplete={() => completeStep('scenario-lab')} />
          </div>
        ) : (
          <StepPanel
            stepKey="scenario-lab"
            title="Scenario Lab"
            description="Apply what you've learned to a real civic scenario or source document."
            onContinue={() => completeStep('scenario-lab')}
            ctaLabel="Scenario Complete"
          />
        ))}

      {currentStep === 'practice' &&
        (mission.practiceAssessmentId ? (
          <div className="space-y-4 rounded-2xl border-2 border-amber-200 bg-white p-5 shadow-card">
            <StepContextBar stepKey="practice" />
            <div className="flex items-start justify-between gap-3">
              <StepHeader icon="bolt" title="Practice Arena" tone="amber">
                Miss a few in a row and I&apos;ll walk one through with you — that&apos;s the point
                of practice.
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
            stepKey="practice"
            title="Practice Arena"
            description="No practice set is available for this benchmark yet — head straight to the Readiness Check."
            onContinue={() => completeStep('practice')}
            ctaLabel="Continue"
          />
        ))}

      {currentStep === 'readiness-check' &&
        (mission.readinessAssessmentId ? (
          <div className="space-y-4 rounded-2xl border-2 border-indigo-100 bg-white p-5 shadow-card">
            <StepContextBar stepKey="readiness-check" />
            <StepHeader icon="target" title="Readiness Check">
              Score 70% or higher and the Mastery Challenge opens up.
            </StepHeader>
            <AssessmentPlayer
              key={readinessAttempt}
              assessmentId={mission.readinessAssessmentId}
              onComplete={(r) => {
                setReadinessResult({ passed: r.passed, reviewTopics: r.reviewTopics ?? null })
                // A skipped (empty) check is not a pass and unlocks nothing.
                if (r.passed && !r.skipped) {
                  update((p) => recordReadinessPassed(p, code, r.readinessToken, new Date()))
                }
              }}
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
            stepKey="readiness-check"
            title="Readiness Check"
            description="Short formative quiz to see if you're ready for the Mastery Challenge."
            onContinue={() => completeStep('readiness-check')}
            ctaLabel="Continue"
          />
        ))}

      {currentStep === 'mastery-challenge' && (
        <div className="space-y-4">
          {/* Own white card: the context bar is styled for light surfaces, and the
              intro panel below is a dark gradient. Every one of the nine steps
              gets the same orientation line this way. */}
          <div className="rounded-2xl border-2 border-indigo-100 bg-white p-5 shadow-card">
            <StepContextBar stepKey="mastery-challenge" />
          </div>
          {!masteryFormId ? (
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
                This is the final assessment. You need 80% or higher to master this benchmark and
                unlock the next mission. You&apos;ll rate how sure you are on each question.
              </p>
              {mission.masteryFormIds.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setMasteryFormId(pickMasteryForm(mission.masteryFormIds, progress, code))}
                  className="relative inline-block rounded-2xl border-b-4 border-amber-600 bg-amber-400 px-7 py-3 font-display text-base font-bold text-amber-950 transition-colors hover:bg-amber-300 active:translate-y-[3px] active:border-b-0"
                >
                  Begin Mastery Challenge →
                </button>
              ) : (
                <p className="relative text-base text-amber-200">
                  Assessment not yet available for this benchmark.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-indigo-100 bg-white p-5 shadow-card">
              <AssessmentPlayer
                key={masteryFormId}
                assessmentId={masteryFormId}
                readinessToken={record?.readinessToken ?? null}
                onComplete={(r) => {
                  if (r.skipped) return
                  const now = new Date()
                  let outcome: MasteryOutcome = 'NEEDS_REMEDIATION'
                  update((p) => {
                    const recorded = recordMasteryAttempt(p, {
                      code,
                      formId: masteryFormId,
                      score: r.score,
                      passed: r.passed,
                      completionCode: r.completionCode,
                      remediation: r.remediation,
                      now,
                    })
                    outcome = recorded.outcome
                    return recorded.progress
                  })
                  setMasteryResult({ passed: r.passed, outcome, completionCode: r.completionCode })
                }}
              />
            </div>
          )}

          {masteryResult?.passed && masteryResult.completionCode && (
            <CompletionCodeCard code={masteryResult.completionCode} missionTitle={mission.benchmarkTitle} />
          )}

          {masteryResult && !masteryResult.passed && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
              <p className="flex-1 text-base font-semibold text-amber-900">
                {masteryResult.outcome === 'OFF_RAMP'
                  ? 'You have given this mission real effort. It will come back in your Daily Drill, and the next mission is now open.'
                  : 'When you are ready for another try, you will get a different set of questions.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setMasteryResult(null)
                  setMasteryFormId(null)
                }}
                className="rounded-2xl border-2 border-b-4 border-gray-300 bg-white px-4 py-2 font-display text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 active:translate-y-[2px] active:border-b-2"
              >
                Back to the challenge start
              </button>
            </div>
          )}

          {/* The mission debrief. The player above already shows the score, the
              confetti, the Founder card and the calibration breakdown — this adds
              only the thing that was missing: where to go now. */}
          {masteryResult && (
            <NextStepHandoff
              heading="What's next"
              intro={
                masteryResult.passed
                  ? undefined
                  : "Not there yet — here's how to close the gap before your next attempt."
              }
              secondary="both"
            />
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
  stepKey,
  title,
  description,
  onContinue,
  ctaLabel,
}: {
  stepKey: MissionStepKey
  title: string
  description: string
  onContinue: () => void
  ctaLabel: string
}) {
  return (
    <div className="space-y-4 rounded-2xl border-2 border-indigo-100 bg-white p-6 shadow-card">
      <StepContextBar stepKey={stepKey} />
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
