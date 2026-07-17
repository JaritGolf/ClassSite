/**
 * Lesson-step visibility resolution (ADR 0015).
 *
 * Teachers can toggle MEDIA steps in and out of lessons at two scopes:
 * a global per-step `enabled` flag and a per-class tri-state override
 * (ClassLessonStepVisibility row: visible=true forces show, visible=false
 * forces hide, row absent = inherit global). Pure so jest covers it without
 * DB infra; the mission page applies it server-side.
 */

/** Only media steps are toggleable — hiding core instruction (notes, checks,
 * worked examples, source analyses) could hollow out the walkthrough or, for
 * required checks, change gating semantics. */
export const TOGGLEABLE_STEP_TYPES = ['VIDEO', 'IMAGE', 'DIAGRAM', 'INFOGRAPHIC'] as const

export function isToggleableStepType(stepType: string): boolean {
  return (TOGGLEABLE_STEP_TYPES as readonly string[]).includes(stepType)
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
