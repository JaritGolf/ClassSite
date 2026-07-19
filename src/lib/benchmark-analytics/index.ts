/**
 * Benchmark Analytics — public API
 *
 * All functions require a teacher User ID. Scope is enforced via resolveTeacherId
 * + getTeacherRoster so results are always limited to the teacher's enrolled students.
 */

export { getBenchmarkClassPerformance } from './overview'
export type { BenchmarkOverview } from './overview'

export { getBenchmarkDescription } from './description'
export type { BenchmarkDescription } from './description'

export {
  getPerformanceByReadingLoad,
  getPerformanceByComplexity,
  getPerformanceByStimulusType,
} from './by-dimension'
export type { DimensionBreakdown } from './by-dimension'

export { getDistractorsByMisconception } from './distractors'
export type { DistractorRow } from './distractors'

export { getStudentsInRemediation } from './remediation'
export type { StudentRemediationRow } from './remediation'

export { getBenchmarkSpacedHealth } from './spaced-health'
export type { BenchmarkSpacedHealth } from './spaced-health'
