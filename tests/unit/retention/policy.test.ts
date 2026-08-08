/**
 * Unit — Retention policy resolution (Phase 17, audit §36.18 item 8)
 *
 * Pure env→threshold resolution and cutoff computation.
 */

import {
  parseRetentionDays,
  resolveRetentionConfig,
  resolveStudentRecordRetentionDays,
  cutoffDate,
  DEFAULT_RETENTION_CONFIG,
  STATUTORY_MAX_STUDENT_RETENTION_DAYS,
} from '@/lib/retention/policy'

describe('parseRetentionDays', () => {
  it('treats missing/empty/zero/negative/non-numeric as 0 (retain forever)', () => {
    expect(parseRetentionDays(undefined)).toBe(0)
    expect(parseRetentionDays('')).toBe(0)
    expect(parseRetentionDays('   ')).toBe(0)
    expect(parseRetentionDays('0')).toBe(0)
    expect(parseRetentionDays('-5')).toBe(0)
    expect(parseRetentionDays('abc')).toBe(0)
  })

  it('parses positive integers and floors fractions', () => {
    expect(parseRetentionDays('30')).toBe(30)
    expect(parseRetentionDays('365')).toBe(365)
    expect(parseRetentionDays('7.9')).toBe(7)
  })
})

describe('resolveRetentionConfig', () => {
  it('defaults to retain-forever when env is empty', () => {
    expect(resolveRetentionConfig({})).toEqual(DEFAULT_RETENTION_CONFIG)
  })

  it('reads every threshold from the env record', () => {
    const cfg = resolveRetentionConfig({
      AUDIT_LOG_RETENTION_DAYS: '365',
      VOIDED_ATTEMPT_RETENTION_DAYS: '180',
      ACTIVITY_SESSION_RETENTION_DAYS: '90',
      SUGGESTION_RETENTION_DAYS: '365',
      STUDENT_RECORD_RETENTION_DAYS: '30',
    })
    expect(cfg).toEqual({
      auditLogRetentionDays: 365,
      voidedAttemptRetentionDays: 180,
      activitySessionRetentionDays: 90,
      suggestionRetentionDays: 365,
      studentRecordRetentionDays: 30,
    })
  })

  it('leaves unset thresholds at retain-forever', () => {
    // Adding a data class must not silently start purging an unconfigured one.
    const cfg = resolveRetentionConfig({ AUDIT_LOG_RETENTION_DAYS: '365' })
    expect(cfg.activitySessionRetentionDays).toBe(0)
    expect(cfg.voidedAttemptRetentionDays).toBe(0)
    expect(cfg.suggestionRetentionDays).toBe(0)
  })

  // The one exception to retain-forever, and the reason is statutory.
  it('defaults student-record retention to the 90-day statutory ceiling', () => {
    expect(resolveRetentionConfig({}).studentRecordRetentionDays).toBe(
      STATUTORY_MAX_STUDENT_RETENTION_DAYS
    )
  })
})

describe('resolveStudentRecordRetentionDays — Fla. Stat. § 1006.1494(3)(c)', () => {
  it('defaults to 90 when unset', () => {
    expect(resolveStudentRecordRetentionDays(undefined)).toBe(90)
    expect(resolveStudentRecordRetentionDays('')).toBe(90)
  })

  it('honours a shorter window', () => {
    expect(resolveStudentRecordRetentionDays('30')).toBe(30)
    expect(resolveStudentRecordRetentionDays('1')).toBe(1)
  })

  // A district may shorten the window. It cannot lengthen it past the statute,
  // and a config typo must not be the thing that breaks the law.
  it('clamps anything above 90 DOWN to 90 rather than honouring it', () => {
    expect(resolveStudentRecordRetentionDays('365')).toBe(90)
    expect(resolveStudentRecordRetentionDays('91')).toBe(90)
    expect(resolveStudentRecordRetentionDays('99999')).toBe(90)
  })

  it('allows an explicit 0 opt-out (documented district arrangement)', () => {
    expect(resolveStudentRecordRetentionDays('0')).toBe(0)
    expect(resolveStudentRecordRetentionDays(' 0 ')).toBe(0)
  })

  // The asymmetry that matters: for every other window an unparseable value
  // means "retain forever", which is the safe direction. Here it would mean
  // silently switching off a statutory duty, so garbage falls back to 90.
  it('falls back to 90 — not 0 — for an unparseable or negative value', () => {
    expect(resolveStudentRecordRetentionDays('abc')).toBe(90)
    expect(resolveStudentRecordRetentionDays('-5')).toBe(90)
    expect(resolveStudentRecordRetentionDays('ninety')).toBe(90)
  })
})

describe('cutoffDate', () => {
  it('returns null when days <= 0 (retain forever)', () => {
    expect(cutoffDate(0)).toBeNull()
    expect(cutoffDate(-1)).toBeNull()
  })

  it('subtracts the given days from now', () => {
    const now = new Date('2026-06-19T00:00:00.000Z')
    const cutoff = cutoffDate(10, now)
    expect(cutoff?.toISOString()).toBe('2026-06-09T00:00:00.000Z')
  })
})
