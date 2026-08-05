/**
 * Class Analytics — public API
 *
 * All functions require a teacher User ID. They internally resolve
 * the teacher's roster and scope all queries to enrolled students.
 */

export { getClassStatusDistribution } from './status-distribution'
export type { ClassStatusDistribution } from './status-distribution'

export {
  getClassMasteryByBenchmark,
  getClassMasteryByReportingCategory,
  getClassMasteryByUnit,
  getBenchmarksGroupedByUnit,
} from './class-progress'
export type {
  BenchmarkMasteryRow,
  ReportingCategoryMasteryRow,
  UnitMasteryRow,
  UnitBenchmarkRow,
  UnitBenchmarkGroup,
} from './class-progress'

export { getMostMissedQuestions, getCommonMisconceptions } from './most-missed'
export type { MissedQuestionRow, MisconceptionRow } from './most-missed'

export {
  getStudentsNeedingAction,
  getRemediationCompletionStatus,
} from './needing-action'
export type {
  NeedingActionRow,
  RemediationCompletionRow,
} from './needing-action'

export { getRecommendedSmallGroups } from './small-groups'
export type { SmallGroup } from './small-groups'

export { getEocReadinessTrend } from './eoc-trend'
export type { EocTrendPoint } from './eoc-trend'

export { getOffRampStudents } from './off-ramp'
export type { OffRampRow } from './off-ramp'

export { getStrategyCompletionStatus } from './strategy-completion'
export type { StrategyCompletionRow } from './strategy-completion'

export { getCheckpointLevelsForTeacher } from './checkpoint-levels'
export type { CheckpointLevelRow, ClassCheckpointLevels } from './checkpoint-levels'
