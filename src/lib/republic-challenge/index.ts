/**
 * Republic Challenge — public API. Stamina and blueprint math are pure; the
 * question picker and grader (./stateless) are read-only and anonymous.
 */

export { getStaminaLengthForDate, resolveSessionLength, FINAL_TRIAL_DEFAULT_LENGTH } from './stamina'
export type { StaminaResult, ClassConfig, Mode } from './stamina'

export { allocateByBlueprint, isWithinTolerance } from './blueprint'
export type { BlueprintAllocation } from './blueprint'

export { isFinalTrialWindowOpen, finalTrialOpensAt, schoolYearEndYear } from './final-trial-window'

export { REPORTING_CATEGORY_WEIGHTS, weightForCategoryName } from './weights'

/** Audit action for a teacher changing a class's Republic Challenge settings. */
export const RC_AUDIT_ACTIONS = {
  RC_CLASS_CONFIG_UPDATED: 'RC_CLASS_CONFIG_UPDATED',
} as const
