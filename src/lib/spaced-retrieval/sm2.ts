/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Pure functions implementing the SM-2 algorithm as specified in Section 15.2.
 * No database access — fully unit-testable without mocking.
 *
 * Do NOT substitute FSRS or any other algorithm (spec Rule 5).
 *
 * Confidence scale (student-facing):
 *   0 = "Not sure"
 *   1 = "Pretty sure"
 *   2 = "Very sure"
 *
 * Quality scale (internal SM-2, 0–5):
 *   5 = Correct + Very sure
 *   4 = Correct + Pretty sure
 *   3 = Correct + Not sure
 *   2 = Incorrect + Not sure
 *   1 = Incorrect + Pretty sure
 *   0 = Incorrect + Very sure  (highest-priority misconception flag)
 */

// ── Types ─────────────────────────────────────────────────────────────────────

/** Student confidence rating (0–2). Maps to UI labels in spec Section 15.2. */
export type Confidence = 0 | 1 | 2

/** SM-2 quality score (0–5). Computed from (isCorrect × confidence). */
export type Quality = 0 | 1 | 2 | 3 | 4 | 5

/** The mutable SM-2 state for one (student, benchmark) pair. */
export interface SM2State {
  repetitionCount: number  // starts at 0
  easinessFactor: number   // starts at 2.5, minimum 1.3
  intervalDays: number     // starts at 1
}

/** Initial SM-2 state for a newly mastered benchmark. */
export const INITIAL_SM2_STATE: SM2State = {
  repetitionCount: 0,
  easinessFactor: 2.5,
  intervalDays: 1,
}

/** Minimum easiness factor — enforced by the spec (Section 15.2). */
export const MIN_EASINESS_FACTOR = 1.3

// ── Quality Mapping ───────────────────────────────────────────────────────────

/**
 * Map (isCorrect, confidence) → SM-2 quality score (0–5).
 *
 * Correct answers:
 *   Very sure   (2) → 5
 *   Pretty sure (1) → 4
 *   Not sure    (0) → 3
 *
 * Incorrect answers:
 *   Not sure    (0) → 2
 *   Pretty sure (1) → 1
 *   Very sure   (2) → 0  ← high-priority misconception flag
 */
export function computeQuality(isCorrect: boolean, confidence: Confidence): Quality {
  if (isCorrect) {
    return (3 + confidence) as Quality  // 3, 4, or 5
  } else {
    return (2 - confidence) as Quality  // 2, 1, or 0
  }
}

// ── SM-2 State Update ─────────────────────────────────────────────────────────

/**
 * Apply one SM-2 review to the current state and return the next state.
 *
 * Update rules (verbatim from spec Section 15.2):
 *
 *   if quality < 3:
 *     repetition_count = 0
 *     interval_days = 1
 *   else:
 *     if repetition_count == 0: interval_days = 1
 *     elif repetition_count == 1: interval_days = 6
 *     else: interval_days = round(previous_interval_days * easiness_factor)
 *     repetition_count += 1
 *
 *   easiness_factor = max(1.3, ef + (0.1 - (5-q) * (0.08 + (5-q) * 0.02)))
 *
 * Pure function — does not mutate input, does not access the database.
 */
export function computeNextState(current: SM2State, quality: Quality): SM2State {
  const { repetitionCount, easinessFactor, intervalDays } = current

  let newRepetitionCount: number
  let newIntervalDays: number

  if (quality < 3) {
    // Failed recall — reset streak, review again tomorrow
    newRepetitionCount = 0
    newIntervalDays = 1
  } else {
    // Successful recall — advance interval
    if (repetitionCount === 0) {
      newIntervalDays = 1
    } else if (repetitionCount === 1) {
      newIntervalDays = 6
    } else {
      newIntervalDays = Math.round(intervalDays * easinessFactor)
    }
    newRepetitionCount = repetitionCount + 1
  }

  // EF update formula from SM-2 (spec Section 15.2)
  const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  const newEasinessFactor = Math.max(MIN_EASINESS_FACTOR, easinessFactor + delta)

  return {
    repetitionCount: newRepetitionCount,
    easinessFactor: newEasinessFactor,
    intervalDays: newIntervalDays,
  }
}

// ── Due-date helper ───────────────────────────────────────────────────────────

/**
 * Compute the next due timestamp from now + intervalDays.
 * Accepts an optional `now` for deterministic testing.
 */
export function computeDueAt(intervalDays: number, now: Date = new Date()): Date {
  return new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000)
}

// ── Off-ramp halving helper ───────────────────────────────────────────────────

/**
 * For EXPOSURE_COMPLETE benchmarks, halve the interval.
 * Minimum resulting interval is 1 day (spec Section 15.4).
 */
export function halveInterval(intervalDays: number): number {
  return Math.max(1, Math.floor(intervalDays / 2))
}
