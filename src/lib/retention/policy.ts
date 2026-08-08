/**
 * Data Retention — policy resolution (Phase 17, audit §36.18 item 8)
 *
 * The retention policy is *configurable* via environment variables, with safe
 * "retain forever" defaults. No data is ever deleted unless an admin sets a
 * positive threshold and explicitly runs the purge (see purge.ts).
 *
 * Pure module — no DB, no I/O — so it is trivially testable.
 */

export interface RetentionConfig {
  /** Delete audit logs older than this many days. 0 / unset = retain forever. */
  auditLogRetentionDays: number
  /** Delete voided assessment attempts older than this many days. 0 = keep. */
  voidedAttemptRetentionDays: number
  /**
   * Delete student activity-session rows older than this many days. 0 = keep.
   *
   * Behavioral monitoring data on minors, so districts may well want a shorter
   * window here than for academic records — the session row is not itself an
   * academic record, and deleting it does not touch any student work.
   */
  activitySessionRetentionDays: number
  /**
   * Delete student- and teacher-authored suggestion text older than this many
   * days. 0 = keep.
   *
   * This is the only free prose a student can enter, so it is the only field
   * that could contain something nobody designed for — including a category
   * Fla. Stat. § 1002.222(1)(a) forbids retaining at all. A window bounds that.
   */
  suggestionRetentionDays: number
  /**
   * Days after a student is marked no longer enrolled (`Student.deactivatedAt`)
   * before their records are deleted.
   *
   * Defaults to **90**, the ceiling in Fla. Stat. § 1006.1494(3)(c) — not 0.
   * That is deliberate and is safe because the clock only starts when an
   * administrator records district notice of disenrollment; a student who is
   * still enrolled has `deactivatedAt = null` and is never in scope.
   *
   * Set to 0 only if the district directs a different arrangement in writing.
   */
  studentRecordRetentionDays: number
}

/**
 * Default policy: retain everything (conservative — spec §0 rule 6), EXCEPT
 * disenrolled-student records, which default to the 90-day statutory ceiling.
 */
export const DEFAULT_RETENTION_CONFIG: RetentionConfig = {
  auditLogRetentionDays: 0,
  voidedAttemptRetentionDays: 0,
  activitySessionRetentionDays: 0,
  suggestionRetentionDays: 0,
  studentRecordRetentionDays: 90,
}

/** Fla. Stat. § 1006.1494(3)(c) — the outer limit, not a tunable preference. */
export const STATUTORY_MAX_STUDENT_RETENTION_DAYS = 90

/**
 * Parse a retention-days env value. Non-numeric, negative, or missing values
 * resolve to 0 ("retain forever"). Fractional values are floored.
 */
export function parseRetentionDays(raw: string | undefined): number {
  if (raw == null || raw.trim() === '') return 0
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.floor(n)
}

/**
 * Resolve the active retention config from an environment-like record.
 * Defaults to process.env.
 */
export function resolveRetentionConfig(
  env: Record<string, string | undefined> = process.env
): RetentionConfig {
  return {
    auditLogRetentionDays: parseRetentionDays(env.AUDIT_LOG_RETENTION_DAYS),
    voidedAttemptRetentionDays: parseRetentionDays(env.VOIDED_ATTEMPT_RETENTION_DAYS),
    activitySessionRetentionDays: parseRetentionDays(
      env.ACTIVITY_SESSION_RETENTION_DAYS
    ),
    suggestionRetentionDays: parseRetentionDays(env.SUGGESTION_RETENTION_DAYS),
    studentRecordRetentionDays: resolveStudentRecordRetentionDays(
      env.STUDENT_RECORD_RETENTION_DAYS
    ),
  }
}

/**
 * Student-record retention differs from every other window here in two ways:
 * it defaults to 90 rather than 0, and it is CAPPED at 90.
 *
 * A district may direct a shorter window. It cannot direct a longer one — that
 * is the statutory ceiling in § 1006.1494(3)(c), and the only lawful way past it
 * is express parental consent, which is a per-student fact and not something an
 * environment variable can assert on a whole cohort's behalf. An over-large
 * value is therefore clamped down rather than honoured or rejected: honouring it
 * would silently break the law, and throwing would take the site down over a
 * config typo.
 */
export function resolveStudentRecordRetentionDays(raw: string | undefined): number {
  if (raw == null || raw.trim() === '') return STATUTORY_MAX_STUDENT_RETENTION_DAYS

  const trimmed = raw.trim()

  // Only a literal "0" opts out, and it means a documented district arrangement
  // exists (e.g. the express parental consent the statute allows). Note this is
  // deliberately NOT `parseRetentionDays(raw) === 0`: that helper maps garbage
  // and negatives to 0 too, which for every other window means "retain forever"
  // — a safe default there, and exactly the wrong one here. A typo must not
  // silently switch off a statutory deletion duty.
  if (/^0+$/.test(trimmed)) return 0

  const parsed = parseRetentionDays(trimmed)
  if (parsed === 0) return STATUTORY_MAX_STUDENT_RETENTION_DAYS // unparseable ⇒ safe default

  return Math.min(parsed, STATUTORY_MAX_STUDENT_RETENTION_DAYS)
}

/**
 * Given a threshold in days and a "now", compute the cutoff Date. Rows with a
 * timestamp strictly before the cutoff are eligible for deletion. Returns null
 * when the threshold is 0 (retain forever).
 */
export function cutoffDate(days: number, now: Date = new Date()): Date | null {
  if (days <= 0) return null
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}
