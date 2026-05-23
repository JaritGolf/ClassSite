/**
 * Unit tests — Pearson Correlation (pure functions)
 *
 * Tests pearsonCorrelation and correlationByBucket.
 * No DB, no side effects.
 */

import { pearsonCorrelation, correlationByBucket } from '@/lib/eoc-analytics/correlation'

describe('pearsonCorrelation', () => {
  it('returns 1.0 for perfectly positively correlated data', () => {
    const xs = [1, 2, 3, 4, 5]
    const ys = [2, 4, 6, 8, 10]
    expect(pearsonCorrelation(xs, ys)).toBeCloseTo(1.0, 4)
  })

  it('returns -1.0 for perfectly negatively correlated data', () => {
    const xs = [1, 2, 3, 4, 5]
    const ys = [10, 8, 6, 4, 2]
    expect(pearsonCorrelation(xs, ys)).toBeCloseTo(-1.0, 4)
  })

  it('returns ~0 for uncorrelated data', () => {
    const xs = [1, 2, 3, 4, 5]
    const ys = [3, 3, 3, 3, 3]
    // Zero variance in ys → NaN
    const r = pearsonCorrelation(xs, ys)
    expect(isNaN(r)).toBe(true)
  })

  it('returns NaN for n < 2 (single pair)', () => {
    expect(isNaN(pearsonCorrelation([1], [1]))).toBe(true)
  })

  it('returns NaN for empty arrays', () => {
    expect(isNaN(pearsonCorrelation([], []))).toBe(true)
  })

  it('returns NaN for zero variance in xs', () => {
    const xs = [3, 3, 3, 3]
    const ys = [1, 2, 3, 4]
    expect(isNaN(pearsonCorrelation(xs, ys))).toBe(true)
  })

  it('returns NaN for mismatched array lengths', () => {
    expect(isNaN(pearsonCorrelation([1, 2, 3], [1, 2]))).toBe(true)
  })

  it('matches hand-computed Pearson value for 5-pair dataset to 4 decimals', () => {
    // Dataset: xs = [1, 2, 3, 4, 5], ys = [2, 4, 5, 4, 5]
    // Hand computation:
    //   meanX=3, meanY=4
    //   cov = (-2)(-2) + (-1)(0) + (0)(1) + (1)(0) + (2)(1) = 4 + 0 + 0 + 0 + 2 = 6
    //   varX = 4 + 1 + 0 + 1 + 4 = 10
    //   varY = 4 + 0 + 1 + 0 + 1 = 6
    //   r = 6 / sqrt(60) ≈ 0.7746
    const xs = [1, 2, 3, 4, 5]
    const ys = [2, 4, 5, 4, 5]
    const r = pearsonCorrelation(xs, ys)
    expect(r).toBeCloseTo(6 / Math.sqrt(60), 4)
  })

  it('returns exactly 1.0 for identical arrays', () => {
    const xs = [5, 10, 15, 20]
    const ys = [5, 10, 15, 20]
    expect(pearsonCorrelation(xs, ys)).toBeCloseTo(1.0, 6)
  })
})

describe('correlationByBucket', () => {
  it('returns correlation per bucket', () => {
    const rows = [
      { bucket: 'A', x: 1, y: 2 },
      { bucket: 'A', x: 2, y: 4 },
      { bucket: 'A', x: 3, y: 6 },
      { bucket: 'B', x: 1, y: 6 },
      { bucket: 'B', x: 2, y: 4 },
      { bucket: 'B', x: 3, y: 2 },
    ]
    const result = correlationByBucket(rows)
    expect(result['A']).toBeCloseTo(1.0, 4)
    expect(result['B']).toBeCloseTo(-1.0, 4)
  })

  it('returns NaN for buckets with fewer than 2 pairs', () => {
    const rows = [{ bucket: 'A', x: 1, y: 2 }]
    const result = correlationByBucket(rows)
    expect(isNaN(result['A'])).toBe(true)
  })

  it('returns empty object for empty input', () => {
    const result = correlationByBucket([])
    expect(Object.keys(result)).toHaveLength(0)
  })

  it('handles multiple buckets independently', () => {
    const rows = [
      { bucket: 'RC1', x: 0.8, y: 320 },
      { bucket: 'RC1', x: 0.6, y: 280 },
      { bucket: 'RC1', x: 0.9, y: 350 },
      { bucket: 'RC2', x: 0.5, y: 200 },
      { bucket: 'RC2', x: 0.3, y: 180 },
    ]
    const result = correlationByBucket(rows)
    // RC1 should have a positive correlation
    expect(result['RC1']).toBeGreaterThan(0.9)
    // RC2: 2 pairs, correlation is defined
    expect(isNaN(result['RC2'])).toBe(false)
  })
})
