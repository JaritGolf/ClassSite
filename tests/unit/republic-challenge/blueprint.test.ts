/**
 * Unit Tests: Blueprint Allocation
 *
 * Audit 11 item 2: each category lands within ±5 percentage points of its
 * target weight for any totalQuestions >= 10.
 */

import { allocateByBlueprint, isWithinTolerance } from '@/lib/republic-challenge/blueprint'
import { REPORTING_CATEGORY_WEIGHTS } from '@/lib/eoc-analytics/readiness'

describe('allocateByBlueprint', () => {
  it('returns empty allocation for totalQuestions = 0', () => {
    const result = allocateByBlueprint(0)
    const total = Object.values(result.counts).reduce((a, b) => a + b, 0)
    expect(total).toBe(0)
  })

  it.each([10, 15, 20, 30, 40, 50, 60])(
    'sum of counts equals totalQuestions (%i)',
    (n) => {
      const result = allocateByBlueprint(n)
      const total = Object.values(result.counts).reduce((a, b) => a + b, 0)
      expect(total).toBe(n)
    }
  )

  it.each([10, 15, 20, 30, 40, 50, 60])(
    'every category is within 5 percentage points of target weight (%i)',
    (n) => {
      const result = allocateByBlueprint(n)
      expect(isWithinTolerance(result, n, 5)).toBe(true)
    }
  )

  it('is deterministic across repeated calls', () => {
    const a = allocateByBlueprint(40)
    const b = allocateByBlueprint(40)
    expect(a.counts).toEqual(b.counts)
  })

  it('throws on negative totalQuestions', () => {
    expect(() => allocateByBlueprint(-1)).toThrow()
  })

  it('handles custom weight maps', () => {
    const custom = { A: 0.5, B: 0.3, C: 0.2 }
    const result = allocateByBlueprint(10, custom)
    expect(result.counts.A).toBe(5)
    expect(result.counts.B).toBe(3)
    expect(result.counts.C).toBe(2)
  })

  it('handles weights that do not sum to 1 by normalizing', () => {
    // REPORTING_CATEGORY_WEIGHTS sums to 0.95
    const sum = Object.values(REPORTING_CATEGORY_WEIGHTS).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(0.95, 5)
    // Allocation should still sum exactly to totalQuestions
    expect(
      Object.values(allocateByBlueprint(40).counts).reduce((a, b) => a + b, 0)
    ).toBe(40)
  })

  it('ordered field is sorted by weight desc', () => {
    const result = allocateByBlueprint(40)
    for (let i = 1; i < result.ordered.length; i++) {
      expect(result.ordered[i - 1].weight).toBeGreaterThanOrEqual(
        result.ordered[i].weight
      )
    }
  })
})
