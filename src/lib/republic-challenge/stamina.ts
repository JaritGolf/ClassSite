/**
 * Stamina Ladder (Phase 11 / spec §19.1)
 *
 * Maps the calendar month to the expected longest single-sitting length
 * for the Endurance Trial review mode. Pure functions only.
 *
 * Ladder (Aug → late-April):
 *   Aug-Oct        → 10 questions
 *   Nov-Dec        → 15 questions
 *   Jan-Feb        → 20 questions
 *   Mar            → 30 questions
 *   Apr            → 40 questions
 *   late-Apr / May → full Final Trial length (returned as `null`; caller picks
 *                    the simulation length from elsewhere)
 *
 * "Late April" is interpreted as the last 7 days of April (April 24-30) so
 * that the Final Trial window opens roughly two weeks before the EOC.
 */

export interface StaminaResult {
  /** Recommended session length; null means "use Final Trial full length". */
  length: number | null
  /** Short human label (e.g. "Aug-Oct"). */
  label: string
}

/** The number used when the stamina ladder reaches its peak (Final Trial). */
export const FINAL_TRIAL_DEFAULT_LENGTH = 50

/**
 * Return the stamina-ladder result for a given UTC date.
 *
 * Decisions are made on the UTC month/date so timezone never changes the band.
 */
export function getStaminaLengthForDate(date: Date): StaminaResult {
  const month = date.getUTCMonth() // 0-indexed: Jan = 0
  const day = date.getUTCDate()

  // August (7) - October (9)
  if (month >= 7 && month <= 9) {
    return { length: 10, label: 'Aug-Oct' }
  }
  // November (10) - December (11)
  if (month === 10 || month === 11) {
    return { length: 15, label: 'Nov-Dec' }
  }
  // January (0) - February (1)
  if (month === 0 || month === 1) {
    return { length: 20, label: 'Jan-Feb' }
  }
  // March (2)
  if (month === 2) {
    return { length: 30, label: 'Mar' }
  }
  // April (3): days 1-23 → 40; days 24-30 → Final Trial (null)
  if (month === 3) {
    if (day <= 23) return { length: 40, label: 'Apr' }
    return { length: null, label: 'Late Apr' }
  }
  // May (4) - July (6): Final Trial window / summer
  return { length: null, label: 'May+' }
}

/**
 * Resolve the effective session length for a Republic Challenge.
 *
 * Precedence:
 *   1. Mode-specific override on the Class config (when present and the
 *      mode is ENDURANCE_TRIAL — `rcStaminaOverride`).
 *   2. Generic per-Class `rcSessionLengthOverride`.
 *   3. Mode default:
 *        - QUICK_REVIEW     → 5
 *        - CATEGORY_CHALLENGE / SOURCE_SPRINT / MIXED_MISSION / MISTAKE_REPLAY → 10
 *        - ENDURANCE_TRIAL  → ladder result (or FINAL_TRIAL_DEFAULT_LENGTH when null)
 *        - FINAL_REPUBLIC_TRIAL → FINAL_TRIAL_DEFAULT_LENGTH
 */
export interface ClassConfig {
  rcSessionLengthOverride: number | null
  rcStaminaOverride: number | null
}

export type Mode =
  | 'QUICK_REVIEW'
  | 'CATEGORY_CHALLENGE'
  | 'MIXED_MISSION'
  | 'MISTAKE_REPLAY'
  | 'SOURCE_SPRINT'
  | 'ENDURANCE_TRIAL'
  | 'FINAL_REPUBLIC_TRIAL'

export function resolveSessionLength(
  classConfig: ClassConfig | null,
  mode: Mode,
  now: Date
): number {
  if (mode === 'ENDURANCE_TRIAL') {
    if (classConfig?.rcStaminaOverride != null) return classConfig.rcStaminaOverride
    if (classConfig?.rcSessionLengthOverride != null) return classConfig.rcSessionLengthOverride
    const ladder = getStaminaLengthForDate(now)
    return ladder.length ?? FINAL_TRIAL_DEFAULT_LENGTH
  }

  if (mode === 'FINAL_REPUBLIC_TRIAL') {
    return FINAL_TRIAL_DEFAULT_LENGTH
  }

  if (classConfig?.rcSessionLengthOverride != null) {
    return classConfig.rcSessionLengthOverride
  }

  switch (mode) {
    case 'QUICK_REVIEW':
      return 5
    case 'CATEGORY_CHALLENGE':
    case 'SOURCE_SPRINT':
    case 'MIXED_MISSION':
    case 'MISTAKE_REPLAY':
      return 10
  }
}
