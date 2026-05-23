/**
 * Unit Tests: Stamina Ladder
 *
 * Verifies the calendar → session-length mapping in spec §19.1
 * and the override precedence in `resolveSessionLength`.
 */

import {
  getStaminaLengthForDate,
  resolveSessionLength,
  FINAL_TRIAL_DEFAULT_LENGTH,
} from '@/lib/republic-challenge/stamina'

const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m, day, 12, 0, 0))

describe('getStaminaLengthForDate', () => {
  it.each([
    ['2026-08-15', 10, 'Aug-Oct'],
    ['2026-10-31', 10, 'Aug-Oct'],
    ['2026-11-01', 15, 'Nov-Dec'],
    ['2026-12-31', 15, 'Nov-Dec'],
    ['2027-01-01', 20, 'Jan-Feb'],
    ['2027-02-28', 20, 'Jan-Feb'],
    ['2027-03-15', 30, 'Mar'],
    ['2027-04-01', 40, 'Apr'],
    ['2027-04-23', 40, 'Apr'],
    ['2027-04-24', null, 'Late Apr'],
    ['2027-04-30', null, 'Late Apr'],
    ['2027-05-15', null, 'May+'],
    ['2027-07-04', null, 'May+'],
  ])('%s → length=%s (band=%s)', (iso, expectedLength, expectedLabel) => {
    const result = getStaminaLengthForDate(new Date(iso + 'T12:00:00Z'))
    expect(result.length).toBe(expectedLength)
    expect(result.label).toBe(expectedLabel)
  })
})

describe('resolveSessionLength', () => {
  describe('mode defaults', () => {
    it('QUICK_REVIEW returns 5', () => {
      expect(resolveSessionLength(null, 'QUICK_REVIEW', d(2026, 10, 1))).toBe(5)
    })
    it('CATEGORY_CHALLENGE returns 10', () => {
      expect(resolveSessionLength(null, 'CATEGORY_CHALLENGE', d(2026, 10, 1))).toBe(10)
    })
    it('MIXED_MISSION returns 10', () => {
      expect(resolveSessionLength(null, 'MIXED_MISSION', d(2026, 10, 1))).toBe(10)
    })
    it('MISTAKE_REPLAY returns 10', () => {
      expect(resolveSessionLength(null, 'MISTAKE_REPLAY', d(2026, 10, 1))).toBe(10)
    })
    it('SOURCE_SPRINT returns 10', () => {
      expect(resolveSessionLength(null, 'SOURCE_SPRINT', d(2026, 10, 1))).toBe(10)
    })
    it('FINAL_REPUBLIC_TRIAL returns FINAL_TRIAL_DEFAULT_LENGTH', () => {
      expect(resolveSessionLength(null, 'FINAL_REPUBLIC_TRIAL', d(2026, 10, 1))).toBe(
        FINAL_TRIAL_DEFAULT_LENGTH
      )
    })
  })

  describe('Endurance Trial — date-driven', () => {
    it('uses ladder length in October (10)', () => {
      expect(resolveSessionLength(null, 'ENDURANCE_TRIAL', d(2026, 9, 1))).toBe(10)
    })
    it('uses ladder length in March (30)', () => {
      expect(resolveSessionLength(null, 'ENDURANCE_TRIAL', d(2027, 2, 15))).toBe(30)
    })
    it('falls back to FINAL_TRIAL_DEFAULT_LENGTH in May (ladder=null)', () => {
      expect(resolveSessionLength(null, 'ENDURANCE_TRIAL', d(2027, 4, 1))).toBe(
        FINAL_TRIAL_DEFAULT_LENGTH
      )
    })
  })

  describe('per-Class overrides', () => {
    it('rcStaminaOverride wins over ladder for ENDURANCE_TRIAL', () => {
      const cfg = { rcSessionLengthOverride: null, rcStaminaOverride: 25 }
      expect(resolveSessionLength(cfg, 'ENDURANCE_TRIAL', d(2027, 2, 15))).toBe(25)
    })
    it('rcSessionLengthOverride applies to non-final modes', () => {
      const cfg = { rcSessionLengthOverride: 12, rcStaminaOverride: null }
      expect(resolveSessionLength(cfg, 'QUICK_REVIEW', d(2026, 10, 1))).toBe(12)
    })
    it('FINAL_REPUBLIC_TRIAL ignores rcSessionLengthOverride', () => {
      const cfg = { rcSessionLengthOverride: 12, rcStaminaOverride: null }
      expect(resolveSessionLength(cfg, 'FINAL_REPUBLIC_TRIAL', d(2026, 10, 1))).toBe(
        FINAL_TRIAL_DEFAULT_LENGTH
      )
    })
    it('rcStaminaOverride wins over rcSessionLengthOverride for ENDURANCE_TRIAL', () => {
      const cfg = { rcSessionLengthOverride: 12, rcStaminaOverride: 7 }
      expect(resolveSessionLength(cfg, 'ENDURANCE_TRIAL', d(2027, 2, 15))).toBe(7)
    })
  })
})
