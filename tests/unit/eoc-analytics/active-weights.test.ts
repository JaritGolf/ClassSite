/**
 * Unit tests for the pure active-weights helpers (Phase 13 calibration loop).
 * No DB — exercises resolveCategoryWeight + weightsFromRecommendedChanges only.
 */

import {
  resolveCategoryWeight,
  weightsFromRecommendedChanges,
} from '@/lib/eoc-analytics/active-weights'

describe('resolveCategoryWeight', () => {
  const weights = {
    'Origins and Purposes': 0.3,
    'Roles, Rights, and Responsibilities': 0.25,
    'Government Policies': 0.2,
    'Organization and Function': 0.25,
  }

  it('matches by case-insensitive substring', () => {
    expect(resolveCategoryWeight('Origins and Purposes of Government', weights)).toBe(0.3)
    expect(resolveCategoryWeight('government policies', weights)).toBe(0.2)
  })

  it('returns the exact-key weight', () => {
    expect(resolveCategoryWeight('Organization and Function', weights)).toBe(0.25)
  })

  it('falls back to 0.25 when no key matches', () => {
    expect(resolveCategoryWeight('Something Unrelated', weights)).toBe(0.25)
  })

  it('falls back to 0.25 against an empty weight map', () => {
    expect(resolveCategoryWeight('Origins and Purposes', {})).toBe(0.25)
  })
})

describe('weightsFromRecommendedChanges', () => {
  it('extracts the recommended value per category', () => {
    const json = {
      'Origins and Purposes': { current: 0.275, recommended: 0.31, deltaPercent: 12.7 },
      'Government Policies': { current: 0.175, recommended: 0.15, deltaPercent: -14.3 },
    }
    expect(weightsFromRecommendedChanges(json)).toEqual({
      'Origins and Purposes': 0.31,
      'Government Policies': 0.15,
    })
  })

  it('skips malformed entries but keeps valid ones', () => {
    const json = {
      Good: { current: 0.2, recommended: 0.22, deltaPercent: 10 },
      MissingRecommended: { current: 0.2, deltaPercent: 0 },
      NotANumber: { current: 0.2, recommended: 'oops', deltaPercent: 0 },
    }
    expect(weightsFromRecommendedChanges(json)).toEqual({ Good: 0.22 })
  })

  it('returns null for null / non-object / array / empty input', () => {
    expect(weightsFromRecommendedChanges(null)).toBeNull()
    expect(weightsFromRecommendedChanges(undefined)).toBeNull()
    expect(weightsFromRecommendedChanges('x')).toBeNull()
    expect(weightsFromRecommendedChanges([1, 2, 3])).toBeNull()
    expect(weightsFromRecommendedChanges({})).toBeNull()
  })

  it('rejects non-finite recommended values', () => {
    const json = { Bad: { current: 0.2, recommended: Infinity, deltaPercent: 0 } }
    expect(weightsFromRecommendedChanges(json)).toBeNull()
  })
})
