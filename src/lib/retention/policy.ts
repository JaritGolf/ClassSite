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
}

/** Default policy: retain everything (conservative — spec §0 rule 6). */
export const DEFAULT_RETENTION_CONFIG: RetentionConfig = {
  auditLogRetentionDays: 0,
  voidedAttemptRetentionDays: 0,
  activitySessionRetentionDays: 0,
}

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
  }
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
