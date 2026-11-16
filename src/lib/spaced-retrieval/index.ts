/**
 * Spaced retrieval. The SM-2 algorithm (rule #5) is pure and runs on the
 * student's device; the server only serves drill questions and grades one
 * answer at a time (./drill-stateless).
 */

export {
  computeQuality,
  computeNextState,
  computeDueAt,
  halveInterval,
  INITIAL_SM2_STATE,
  MIN_EASINESS_FACTOR,
} from './sm2'
export type { SM2State, Confidence, Quality } from './sm2'
