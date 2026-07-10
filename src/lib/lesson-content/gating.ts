/**
 * Pure step-selection + progression gating for the mission flow.
 *
 * Kept out of the client components so jest can cover it (no component-test
 * infra in this repo — testMatch is .ts only).
 */

import { parseStepContent, type ParsedStepContent } from './contracts'

/** The LessonStep fields the mission flow works with (subset of the model). */
export interface LessonStepLike {
  id: string
  stepType: string
  title: string
  content: string
  sequenceOrder: number
  required: boolean
}

/** Step types shown in the Guided Training walkthrough, in lesson order. */
export const TRAINING_STEP_TYPES = ['VIDEO', 'NOTE', 'INTERACTIVE_CHECK', 'WORKED_EXAMPLE'] as const

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
