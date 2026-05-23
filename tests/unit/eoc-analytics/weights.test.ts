/**
 * Unit tests — REPORTING_CATEGORY_WEIGHTS and weightForCategoryName
 *
 * Verifies case-insensitive substring matching resolves to correct weights.
 */

import {
  weightForCategoryName,
  REPORTING_CATEGORY_WEIGHTS,
} from '@/lib/eoc-analytics/readiness'

describe('REPORTING_CATEGORY_WEIGHTS', () => {
  it('has exactly 4 categories', () => {
    expect(Object.keys(REPORTING_CATEGORY_WEIGHTS)).toHaveLength(4)
  })

  it('weights sum to approximately 0.95 (spec uses midpoints, not exact 1.0)', () => {
    const total = Object.values(REPORTING_CATEGORY_WEIGHTS).reduce((a, b) => a + b, 0)
    // 0.275 + 0.275 + 0.175 + 0.225 = 0.95
    expect(total).toBeCloseTo(0.95, 5)
  })

  it('each weight is between 0.1 and 0.4', () => {
    for (const w of Object.values(REPORTING_CATEGORY_WEIGHTS)) {
      expect(w).toBeGreaterThan(0.1)
      expect(w).toBeLessThan(0.4)
    }
  })
})

describe('weightForCategoryName', () => {
  it('exact match "Origins and Purposes of Law and Government" resolves to 0.275', () => {
    const w = weightForCategoryName('Origins and Purposes of Law and Government')
    expect(w).toBe(0.275)
  })

  it('exact key "Origins and Purposes" resolves to 0.275', () => {
    const w = weightForCategoryName('Origins and Purposes')
    expect(w).toBe(0.275)
  })

  it('exact key "Roles, Rights, and Responsibilities" resolves to 0.275', () => {
    const w = weightForCategoryName('Roles, Rights, and Responsibilities')
    expect(w).toBe(0.275)
  })

  it('"Government Policies and Political Processes" resolves to 0.175', () => {
    const w = weightForCategoryName('Government Policies and Political Processes')
    expect(w).toBe(0.175)
  })

  it('"Organization and Function of Government" resolves to 0.225', () => {
    const w = weightForCategoryName('Organization and Function of Government')
    expect(w).toBe(0.225)
  })

  it('case-insensitive match "origins and purposes" resolves to 0.275', () => {
    const w = weightForCategoryName('origins and purposes')
    expect(w).toBe(0.275)
  })

  it('unknown category returns 0.25 fallback', () => {
    const w = weightForCategoryName('Unknown Category XYZ')
    expect(w).toBe(0.25)
  })
})
