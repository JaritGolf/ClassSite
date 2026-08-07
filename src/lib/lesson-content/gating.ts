/**
 * Pure step-selection + progression gating for the mission flow.
 *
 * Kept out of the client components so jest can cover it (no component-test
 * infra in this repo — testMatch is .ts only).
 */

import { parseStepContent, type ParsedStepContent } from './contracts'
import type { StepOrigin } from './class-outline'

/**
 * The step fields the mission flow works with — the structural subset that
 * both seeded LessonStep rows and teacher-added class modules satisfy. It is
 * deliberately the same shape as `ResolvedStep` minus `origin`, so every
 * bucketing function below stays generic and passes `origin` (and anything
 * else added later) straight through to the renderer.
 */
export interface LessonStepLike {
  id: string
  stepType: string
  title: string
  content: string
  sequenceOrder: number
  required: boolean
}

/** Step types shown in the Guided Training walkthrough, in lesson order. */
export const TRAINING_STEP_TYPES = [
  'VIDEO',
  'NOTE',
  'INTERACTIVE_CHECK',
  'WORKED_EXAMPLE',
  'IMAGE',
  'DIAGRAM',
  'INFOGRAPHIC',
] as const

export function trainingStepsOf<T extends LessonStepLike>(steps: T[]): T[] {
  return steps.filter((s) => (TRAINING_STEP_TYPES as readonly string[]).includes(s.stepType))
}

export function vocabStepsOf<T extends LessonStepLike>(steps: T[]): T[] {
  return steps.filter((s) => s.stepType === 'VOCABULARY')
}

export function scenarioStepsOf<T extends LessonStepLike>(steps: T[]): T[] {
  return steps.filter((s) => s.stepType === 'SOURCE_ANALYSIS')
}

/**
 * A step blocks "Next" until attempted only when it is a *required* check that
 * actually parsed as interactive — a malformed check degrades to text and must
 * never gate progression.
 */
export function stepNeedsAttempt(step: LessonStepLike, parsed?: ParsedStepContent): boolean {
  const p = parsed ?? parseStepContent(step.stepType, step.content)
  return step.required && p.kind === 'interactive-check'
}

/** Can the student advance past `step` given the checks they've attempted? */
export function canAdvance(step: LessonStepLike, attemptedStepIds: ReadonlySet<string>): boolean {
  return !stepNeedsAttempt(step) || attemptedStepIds.has(step.id)
}

/** A bucket step plus the id its position should be reported to the server as. */
export type WithResumeAnchor<T> = T & { progressStepId: string | null }

/**
 * Attach the resume pointer each step should report to /api/mission/progress.
 *
 * `StudentProgress.currentStepId` is a foreign key to LessonStep, so a
 * teacher-added module can never be written to it. A built-in step reports
 * itself; a class module reports the nearest PRECEDING BUILT-IN STEP IN THE
 * SAME BUCKET, or null when there is none.
 *
 * "In the same bucket" is load-bearing, not a detail. MissionFlow resolves the
 * saved pointer with `trainingSteps.findIndex(s => s.id === resumeStepId)`.
 * An anchor taken from the whole lesson could be a VOCABULARY or
 * SOURCE_ANALYSIS step, which is absent from the training bucket — findIndex
 * returns -1 and the student is silently dropped back to the first training
 * step. So anchors must be computed per bucket, after bucketing.
 */
export function withResumeAnchors<T extends LessonStepLike & { origin: StepOrigin }>(
  bucket: readonly T[]
): WithResumeAnchor<T>[] {
  let lastBuiltIn: string | null = null
  return bucket.map((step) => {
    if (step.origin === 'BUILTIN') lastBuiltIn = step.id
    return {
      ...step,
      progressStepId: step.origin === 'BUILTIN' ? step.id : lastBuiltIn,
    }
  })
}
