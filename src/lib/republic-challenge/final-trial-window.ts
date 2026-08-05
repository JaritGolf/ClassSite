/**
 * When the Final Republic Trial opens.
 *
 * ── The bug this fixes ───────────────────────────────────────────────────────
 * The gate used to be `now >= new Date(Date.UTC(now.getUTCFullYear(), 3, 1))`
 * — April 1st of the CALENDAR year. A school year straddles New Year, so in
 * August 2026, at the start of the 2026-2027 year, that reads as April 1st 2026,
 * which is already past. The Final Trial therefore opened on day one of school.
 *
 * That is not a cosmetic date bug. The Final Trial is a full 50-item EOC
 * simulation and `rcAttemptsAllowed` defaults to 1, so a curious 12-year-old
 * clicking it in week one permanently spends the single attempt the year-end
 * check depends on — before they have been taught anything.
 *
 * The gate is now anchored to the school year the student is actually enrolled
 * in, so it opens in the April that belongs to THAT year.
 */

/** The month (0-indexed) the trial opens in. April, per spec Section 11. */
const FINAL_TRIAL_OPEN_MONTH = 3

/**
 * A school year running Aug–Jul rolls over in July. Any date from July onward
 * belongs to the year that ENDS the following spring.
 */
const SCHOOL_YEAR_ROLLOVER_MONTH = 6

/**
 * The calendar year a school year ends in.
 *
 * Accepts the `Class.schoolYear` format ("2026-2027") and returns 2027. Falls
 * back to inferring from `now` when the string is missing or malformed, rather
 * than throwing — a bad config string must not take down the hub.
 */
export function schoolYearEndYear(schoolYear: string | null | undefined, now: Date): number {
  if (schoolYear) {
    // "2026-2027" → 2027. Also tolerates a bare "2027".
    const parts = schoolYear.split('-').map((p) => Number.parseInt(p.trim(), 10))
    const last = parts[parts.length - 1]
    if (Number.isInteger(last) && last > 1900 && last < 3000) return last
  }

  // No usable string: infer from the date. July onward belongs to the year that
  // ends next spring.
  return now.getUTCMonth() >= SCHOOL_YEAR_ROLLOVER_MONTH
    ? now.getUTCFullYear() + 1
    : now.getUTCFullYear()
}

/** The instant the Final Trial opens for the given school year. */
export function finalTrialOpensAt(schoolYear: string | null | undefined, now: Date): Date {
  return new Date(Date.UTC(schoolYearEndYear(schoolYear, now), FINAL_TRIAL_OPEN_MONTH, 1))
}

/** Whether the Final Trial's date window is open. Pure; ignores the feature flag. */
export function isFinalTrialWindowOpen(
  schoolYear: string | null | undefined,
  now: Date
): boolean {
  return now >= finalTrialOpensAt(schoolYear, now)
}
