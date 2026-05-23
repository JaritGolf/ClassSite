/**
 * Audit 11 — Item 2: Blueprint-weighted generation produces distribution
 * within 5 percentage points of target weights.
 *
 * Allocates 40 questions across the four EOC reporting categories via the
 * pure `allocateByBlueprint`, then verifies every category lands within
 * ±5 percentage points of its normalised target weight.
 *
 * Pure-function test — no DB.
 */

import {
  allocateByBlueprint,
  isWithinTolerance,
} from '@/lib/republic-challenge'
import { REPORTING_CATEGORY_WEIGHTS } from '@/lib/eoc-analytics/readiness'

describe('Audit 11 item 2 — blueprint allocation within ±5pp', () => {
  it.each([10, 15, 20, 30, 40, 50, 60])(
    'totalQuestions=%i — each category within ±5 percentage points',
    (n) => {
      const result = allocateByBlueprint(n)
      expect(isWithinTolerance(result, n, 5)).toBe(true)
    }
  )

  it('40-question Mixed Mission lands within ±5pp on every category', () => {
    const allocation = allocateByBlueprint(40)
    const sum = Object.values(REPORTING_CATEGORY_WEIGHTS).reduce((a, b) => a + b, 0)
    for (const [name, weight] of Object.entries(REPORTING_CATEGORY_WEIGHTS)) {
      const targetPct = (weight / sum) * 100
      const actualPct = (allocation.counts[name] / 40) * 100
      expect(Math.abs(actualPct - targetPct)).toBeLessThanOrEqual(5)
    }
  })

  it('sum of counts always equals totalQuestions', () => {
    for (const n of [10, 15, 20, 30, 40, 50, 60]) {
      const total = Object.values(allocateByBlueprint(n).counts).reduce(
        (a, b) => a + b,
        0
      )
      expect(total).toBe(n)
    }
  })
})
