/**
 * Progress Checkpoints — Public API
 *
 * Nine-week progress checkpoints: a teacher sets four end dates and up to four
 * target missions each; a student's standing at a checkpoint is a Level.
 *
 * Levels only DESCRIBE progress. Nothing in this module gates content, and
 * nothing outside it should import these functions to decide what a student may
 * open — see tests/integration/progress-checkpoints/no-gating.test.ts.
 *
 * All consumers should import from here, not from internal module files.
 */

export {
  computeCheckpointLevel,
  missionsRemainingToTarget,
  validateTargetOrder,
  validateCheckpointProgression,
  endOfSchoolDayUtc,
  isCheckpointClosed,
  clearedBenchmarkIdsAsOf,
  CLEARED_STATUSES,
  SCHOOL_TIME_ZONE,
  MIN_LEVEL,
  MAX_LEVEL,
  LEVELS,
} from './levels'
export type { LevelTarget, LevelOutcome, ClearableRow, TargetOrderProblem } from './levels'

export {
  getProgressPlanForClass,
  saveProgressTargets,
  setClassUsesOwnPlan,
  getTargetOptions,
  resolvePlanIdForClass,
  ProgressCheckpointError,
  PROGRESS_CHECKPOINT_AUDIT_ACTIONS,
  CHECKPOINT_NUMBERS,
  CHECKPOINT_COUNT,
} from './config'
export type {
  TargetOption,
  ProgressPlanView,
  CheckpointConfigView,
  CheckpointConfigInput,
} from './config'

export {
  getStudentCheckpoints,
  getCheckpointMarkersForStudent,
  buildCheckpointViews,
  loadCheckpointContext,
  resolveStudentClassId,
} from './student-level'
export type {
  CheckpointLevelView,
  CheckpointContext,
  CheckpointMarker,
  StudentCheckpointsResult,
} from './student-level'

export { lockCheckpointsForStudents, lockPlanForStudents } from './snapshot'
export type { LockableCheckpoint, LockedLevel } from './snapshot'
