/**
 * Unit — Retention policy resolution (Phase 17, audit §36.18 item 8)
 *
 * Pure env→threshold resolution and cutoff computation.
 */

import {
  parseRetentionDays,
  resolveRetentionConfig,
  cutoffDate,
  DEFAULT_RETENTION_CONFIG,
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
    })
    expect(cfg).toEqual({
      auditLogRetentionDays: 365,
      voidedAttemptRetentionDays: 180,
      activitySessionRetentionDays: 90,
    })
  })

  it('leaves unset thresholds at retain-forever', () => {
    // Adding a data class must not silently start purging an unconfigured one.
    const cfg = resolveRetentionConfig({ AUDIT_LOG_RETENTION_DAYS: '365' })
    expect(cfg.activitySessionRetentionDays).toBe(0)
    expect(cfg.voidedAttemptRetentionDays).toBe(0)
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
