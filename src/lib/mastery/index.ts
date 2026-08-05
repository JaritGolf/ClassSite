/**
 * Mastery Engine — Public API
 *
 * All consumers should import from here, not from internal module files.
 */

export { updateProgressAfterAttempt, MasteryError } from './status'
export type { ProgressUpdateResult } from './status'

export { unlockNextBenchmark, findNextReachableBenchmark } from './unlock'

export {
  computeAvailability,
  loadAvailabilityInputs,
  getMissionAvailability,
  canOpenMission,
  pickCurrentMissionId,
  getPlayableBenchmarkIds,
  PLAYABLE_BENCHMARK_WHERE,
} from './availability'

export {
  setBenchmarkReadiness,
  getBenchmarkReadiness,
  ReadinessFlagError,
} from './readiness-flag'
export type { BenchmarkReadiness } from './readiness-flag'
export type {
  MissionNodeState,
  MissionAvailability,
  AvailabilityBenchmark,
  AvailabilityInputs,
} from './availability'

export { checkOffRamp, isOffRampConditionMet } from './off-ramp'

export { applyTeacherOverride, OverrideError } from './override'
export type { TeacherOverrideResult } from './override'
