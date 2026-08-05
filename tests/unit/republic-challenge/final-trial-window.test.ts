/**
 * When the Final Republic Trial opens.
 *
 * Regression cover for a date bug with real student cost. The gate used to be
 * `now >= April 1 of now.getUTCFullYear()`. A school year straddles New Year, so
 * in August 2026 — day one of the 2026-2027 year — that resolved to April 1st
 * 2026, already in the past, and the Trial read OPEN.
 *
 * That matters because the Final Trial is a 50-item EOC simulation and
 * `rcAttemptsAllowed` defaults to 1. A curious 12-year-old clicking it in week
 * one permanently spends the single attempt the year-end check depends on,
 * before they have been taught anything.
 *
 * Pure functions, no DB — every branch is a fixture.
 */

import {
  schoolYearEndYear,
  finalTrialOpensAt,
  isFinalTrialWindowOpen,
} from '@/lib/republic-challenge/final-trial-window'

/** UTC date helper so these assertions never depend on the runner's timezone. */
function utc(year: number, month1: number, day: number): Date {
  return new Date(Date.UTC(year, month1 - 1, day))
}

describe('schoolYearEndYear', () => {
  it('reads the ending year out of a "2026-2027" string', () => {
    expect(schoolYearEndYear('2026-2027', utc(2026, 8, 4))).toBe(2027)
  })

  it('tolerates a bare single year', () => {
    expect(schoolYearEndYear('2027', utc(2026, 8, 4))).toBe(2027)
  })

  it('tolerates surrounding whitespace', () => {
    expect(schoolYearEndYear(' 2026 - 2027 ', utc(2026, 8, 4))).toBe(2027)
  })

  it.each([null, undefined, '', 'not-a-year', '20-21'])(
    'falls back to inferring from the date rather than throwing on %p',
    (bad) => {
      // A malformed config string must never take down the Republic Challenge hub.
      expect(() => schoolYearEndYear(bad as string | null, utc(2026, 8, 4))).not.toThrow()
      expect(schoolYearEndYear(bad as string | null, utc(2026, 8, 4))).toBe(2027)
    }
  )

  it('rolls the inferred year over in July, not January', () => {
    // A school year runs Aug-Jul, so anything from July on belongs to the year
    // that ends the FOLLOWING spring.
    expect(schoolYearEndYear(null, utc(2026, 6, 30))).toBe(2026) // June -> ends this spring
    expect(schoolYearEndYear(null, utc(2026, 7, 1))).toBe(2027) // July -> ends next spring
    expect(schoolYearEndYear(null, utc(2026, 12, 31))).toBe(2027)
    expect(schoolYearEndYear(null, utc(2027, 3, 1))).toBe(2027)
  })
})

describe('finalTrialOpensAt', () => {
  it('opens April 1 of the year the school year ENDS', () => {
    expect(finalTrialOpensAt('2026-2027', utc(2026, 8, 4)).toISOString()).toBe(
      '2027-04-01T00:00:00.000Z'
    )
  })
})

describe('isFinalTrialWindowOpen — the August regression', () => {
  it('is CLOSED in August at the start of the school year', () => {
    // THE regression. The old calendar-year gate returned true here, which let a
    // student burn their one attempt in week one.
    expect(isFinalTrialWindowOpen('2026-2027', utc(2026, 8, 4))).toBe(false)
  })

  it.each([
    ['September', utc(2026, 9, 15)],
    ['December', utc(2026, 12, 20)],
    ['January', utc(2027, 1, 10)],
    ['March', utc(2027, 3, 31)],
  ])('is CLOSED in %s, before the April window', (_label, when) => {
    expect(isFinalTrialWindowOpen('2026-2027', when)).toBe(false)
  })

  it('opens exactly on April 1 of the ending year', () => {
    expect(isFinalTrialWindowOpen('2026-2027', utc(2027, 4, 1))).toBe(true)
  })

  it.each([
    ['mid-April', utc(2027, 4, 15)],
    ['May', utc(2027, 5, 20)],
    ['June', utc(2027, 6, 1)],
  ])('stays open through %s to the end of the year', (_label, when) => {
    expect(isFinalTrialWindowOpen('2026-2027', when)).toBe(true)
  })

  it('closes again for the NEXT school year', () => {
    // August 2027 starts 2027-2028; last year's April must not keep it open.
    expect(isFinalTrialWindowOpen('2027-2028', utc(2027, 8, 4))).toBe(false)
  })

  it('is closed in August even with no school year configured', () => {
    // The fallback path must not reintroduce the bug for an unenrolled student.
    expect(isFinalTrialWindowOpen(null, utc(2026, 8, 4))).toBe(false)
  })
})
