/**
 * Mastery — public API (server side).
 *
 * The server no longer holds any student's mastery state. What remains here is
 * curriculum-level: which missions are playable, and the teacher's switch for
 * opening a mission. The mastery / unlock / off-ramp RULES are pure and live in
 * ./availability-core, where the student's own device applies them.
 */

export { getPlayableBenchmarkIds, PLAYABLE_BENCHMARK_WHERE } from './availability'

export {
  computeAvailability,
  pickCurrentMissionId,
  isOffRampConditionMet,
  pickMasteryFormIndex,
  TERMINAL_STATUSES,
} from './availability-core'
export type {
  MissionProgressStatus,
  MissionNodeState,
  MissionAvailability,
  AvailabilityBenchmark,
  AvailabilityInputs,
} from './availability-core'

export { setBenchmarkReadiness, getBenchmarkReadiness, ReadinessFlagError } from './readiness-flag'
export type { BenchmarkReadiness } from './readiness-flag'
