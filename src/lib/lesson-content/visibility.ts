/**
 * Lesson-step visibility resolution (ADR 0015).
 *
 * Teachers can toggle MEDIA steps in and out of lessons at two scopes:
 * a global per-step `enabled` flag and a per-class tri-state override
 * (ClassLessonStepVisibility row: visible=true forces show, visible=false
 * forces hide, row absent = inherit global). Pure so jest covers it without
 * DB infra; the mission page applies it server-side.
 */

/**
 * Only media steps are toggleable AT THE GLOBAL SCOPE. That flag is site-wide
 * — it changes the lesson for every class on the platform — so hiding core
 * instruction (notes, checks, worked examples, source analyses) stays
 * off-limits there.
 *
 * The per-class scope is deliberately wider: see CLASS_HIDEABLE_STEP_TYPES.
 */
export const TOGGLEABLE_STEP_TYPES = ['VIDEO', 'IMAGE', 'DIAGRAM', 'INFOGRAPHIC'] as const

export function isToggleableStepType(stepType: string): boolean {
  return (TOGGLEABLE_STEP_TYPES as readonly string[]).includes(stepType)
}

/**
 * A teacher may hide ANY module type for their own class (ADR 0023).
 *
 * Widening this beyond media is safe in a way widening the global flag is not:
 * the change is class-local, reversible, and never touches shared content. It
 * is also monotonically *relaxing* for gating — `stepNeedsAttempt` only gates
 * on steps present in the list, so hiding one can remove a gate but can never
 * create an unsatisfiable one. The one thing a class may not do is hide its
 * last remaining Training module, which is enforced server-side (that would
 * turn the mission into pre-check → quiz).
 */
export const CLASS_HIDEABLE_STEP_TYPES = [
  'VIDEO',
  'NOTE',
  'INTERACTIVE_CHECK',
  'DISCUSSION',
  'WORKED_EXAMPLE',
  'VOCABULARY',
  'SOURCE_ANALYSIS',
  'IMAGE',
  'DIAGRAM',
  'INFOGRAPHIC',
] as const

export function isClassHideableStepType(stepType: string): boolean {
  return (CLASS_HIDEABLE_STEP_TYPES as readonly string[]).includes(stepType)
}

/**
 * Filter steps to those visible for a class: shown iff the class override
 * says so, else the step's global `enabled` flag. Order is preserved.
 */
export function resolveVisibleSteps<T extends { id: string; enabled: boolean }>(
  steps: T[],
  classOverrides: ReadonlyMap<string, boolean>
): T[] {
  return steps.filter((s) => classOverrides.get(s.id) ?? s.enabled)
}
