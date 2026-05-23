/**
 * Unit tests — Wilson Confidence Interval
 *
 * Verifies the wilsonInterval pure function against known inputs and edge cases.
 */

import { wilsonInterval } from '@/lib/eoc-analytics/readiness'

describe('wilsonInterval', () => {
  it('wilsonInterval(0, 0) returns {low:0, high:0} (degenerate case)', () => {
    const { low, high } = wilsonInterval(0, 0)
    expect(low).toBe(0)
    expect(high).toBe(0)
  })

  it('wilsonInterval(5, 10) ≈ {low: 0.236, high: 0.764}', () => {
    const { low, high } = wilsonInterval(5, 10)
    expect(low).toBeCloseTo(0.236, 2)
    expect(high).toBeCloseTo(0.764, 2)
  })

  it('wilsonInterval(n, n) has high = 1.0 (all successes edge case)', () => {
    const { high } = wilsonInterval(10, 10)
    expect(high).toBe(1)
  })

  it('wilsonInterval(n, n) has low > 0 (Wilson lower bound for all successes)', () => {
    const { low } = wilsonInterval(10, 10)
    expect(low).toBeGreaterThan(0)
    expect(low).toBeLessThan(1)
  })

  it('wilsonInterval(0, 10) has low = 0', () => {
    const { low, high } = wilsonInterval(0, 10)
    expect(low).toBe(0)
    expect(high).toBeGreaterThan(0)
  })

  it('interval is symmetric around p=0.5', () => {
    const { low: low1, high: high1 } = wilsonInterval(3, 10)
    const { low: low2, high: high2 } = wilsonInterval(7, 10)
    // low of 3/10 should match 1-high of 7/10
    expect(low1).toBeCloseTo(1 - high2, 5)
    expect(high1).toBeCloseTo(1 - low2, 5)
  })

  it('interval width shrinks as sample size increases', () => {
    const small = wilsonInterval(50, 100)
    const large = wilsonInterval(500, 1000)
    const smallWidth = small.high - small.low
    const largeWidth = large.high - large.low
    expect(largeWidth).toBeLessThan(smallWidth)
  })

  it('bounds are always in [0, 1]', () => {
    for (const [s, n] of [[0, 1], [1, 1], [3, 5], [10, 10], [0, 100]]) {
      const { low, high } = wilsonInterval(s, n)
      expect(low).toBeGreaterThanOrEqual(0)
      expect(low).toBeLessThanOrEqual(1)
      expect(high).toBeGreaterThanOrEqual(0)
      expect(high).toBeLessThanOrEqual(1)
    }
  })
})
