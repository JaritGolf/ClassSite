/**
 * EOC Analytics — Public API
 *
 * Slice 10a: readiness, snapshot writers, dimension breakdowns, trend, validation.
 */

export {
  computeStudentReadiness,
  computeClassReadiness,
  REPORTING_CATEGORY_WEIGHTS,
  wilsonInterval,
  weightForCategoryName,
} from './readiness'
export type { StudentReadiness, ClassReadiness, ReadinessByCategory } from './readiness'

export {
  recordReadinessSnapshot,
  recordClassReadinessSnapshot,
  getOrCreateDailyClassSnapshot,
  startOfUtcDay,
} from './snapshot'

export {
  getDimensionBreakdownForClass,
  getDimensionBreakdownForStudent,
} from './breakdowns'
export type { ClassDimensionBreakdown, StudentDimensionBreakdown } from './breakdowns'

export { getReadinessTrend, TrendGranularity } from './trend'
export type { TrendPoint, GranularityType } from './trend'

export { validateMasteryAgainstSeed } from './validation'
export type { SeedValidationResult } from './validation'

// ── Error Types ────────────────────────────────────────────────────────────────

export class EocAnalyticsError extends Error {
  code: 'NOT_FOUND' | 'INVALID_INPUT'

  constructor(message: string, code: 'NOT_FOUND' | 'INVALID_INPUT') {
    super(message)
    this.name = 'EocAnalyticsError'
    this.code = code
  }
}
