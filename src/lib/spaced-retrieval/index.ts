/**
 * Spaced Retrieval Engine — Public API
 *
 * All cross-module imports must go through this index.
 * Spec reference: Section 15
 */

export { computeQuality, computeNextState, computeDueAt, halveInterval, INITIAL_SM2_STATE, MIN_EASINESS_FACTOR } from './sm2'
export type { SM2State, Confidence, Quality } from './sm2'

export { getDrillQueue, DRILL_CAP } from './drill'
export type { DrillItem, DrillOption } from './drill'

export { submitReview, gradeReviewAnswer, ReviewError } from './review'
export type { ReviewResult } from './review'

export { getDecayingBenchmarks, getClassDecayRates } from './decay'
export type { DecayingBenchmark, ClassDecayRate } from './decay'
