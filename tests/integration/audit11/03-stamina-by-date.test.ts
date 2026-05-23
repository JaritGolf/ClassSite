/**
 * Audit 11 — Item 3: Stamina ladder enforces session length by time of year.
 *
 * Resolves session length for the Endurance Trial mode across the six
 * date bands defined in spec §19.1 and verifies the lengths match.
 *
 * Pure-function test — no DB.
 */

import {
  resolveSessionLength,
  getStaminaLengthForDate,
  FINAL_TRIAL_DEFAULT_LENGTH,
} from '@/lib/republic-challenge'

const dateAt = (iso: string) => new Date(iso + 'T12:00:00Z')

describe('Audit 11 item 3 — stamina ladder enforces session length by time of year', () => {
  it.each([
    ['2026-09-15', 10, 'Aug-Oct'],
    ['2026-11-20', 15, 'Nov-Dec'],
    ['2027-01-15', 20, 'Jan-Feb'],
    ['2027-02-10', 20, 'Jan-Feb'],
    ['2027-03-15', 30, 'Mar'],
    ['2027-04-15', 40, 'Apr'],
  ])(
    'Endurance Trial on %s → length=%i (band=%s)',
    (iso, expectedLength, expectedLabel) => {
      const date = dateAt(iso)
      const ladder = getStaminaLengthForDate(date)
      expect(ladder.label).toBe(expectedLabel)
      expect(ladder.length).toBe(expectedLength)
      expect(resolveSessionLength(null, 'ENDURANCE_TRIAL', date)).toBe(expectedLength)
    }
  )

  it('Late-April / May falls back to Final Trial default length', () => {
    expect(resolveSessionLength(null, 'ENDURANCE_TRIAL', dateAt('2027-04-25'))).toBe(
      FINAL_TRIAL_DEFAULT_LENGTH
    )
    expect(resolveSessionLength(null, 'ENDURANCE_TRIAL', dateAt('2027-05-10'))).toBe(
      FINAL_TRIAL_DEFAULT_LENGTH
    )
  })

  it('rcStaminaOverride beats the ladder', () => {
    const cfg = { rcSessionLengthOverride: null, rcStaminaOverride: 12 }
    expect(resolveSessionLength(cfg, 'ENDURANCE_TRIAL', dateAt('2027-03-15'))).toBe(12)
  })
})
