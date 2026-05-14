/**
 * Mastery Engine — Public API
 *
 * All consumers should import from here, not from internal module files.
 */

export { updateProgressAfterAttempt, MasteryError } from './status'
export type { ProgressUpdateResult } from './status'

export { unlockNextBenchmark } from './unlock'

export { checkOffRamp, isOffRampConditionMet } from './off-ramp'

export { applyTeacherOverride, OverrideError } from './override'
export type { TeacherOverrideResult } from './override'
