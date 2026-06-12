/**
 * Audit 13 — Item 3: Correlation calculations produce expected values on
 * synthetic test data. Exercises the pure pearsonCorrelation + correlationByBucket
 * (no DB). Prefix: test-audit13-03-
 */

import { pearsonCorrelation, correlationByBucket } from '@/lib/eoc-analytics'

describe('Audit 13 — Item 3: correlation on synthetic data', () => {
  it('3a. perfect positive correlation = 1', () => {
    expect(pearsonCorrelation([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 6)
  })

  it('3b. perfect negative correlation = -1', () => {
    expect(pearsonCorrelation([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1, 6)
  })

  it('3c. known intermediate value', () => {
    // r for these two series is ~0.9962
    const r = pearsonCorrelation([10, 20, 30, 40, 50], [12, 24, 33, 44, 60])
    expect(r).toBeGreaterThan(0.98)
    expect(r).toBeLessThanOrEqual(1)
  })

  it('3d. correlationByBucket computes a per-bucket map', () => {
    const rows = [
      { bucket: 'A', x: 1, y: 2 },
      { bucket: 'A', x: 2, y: 4 },
      { bucket: 'A', x: 3, y: 6 },
      { bucket: 'B', x: 1, y: 6 },
      { bucket: 'B', x: 2, y: 4 },
      { bucket: 'B', x: 3, y: 2 },
    ]
    const result = correlationByBucket(rows)
    expect(result['A']).toBeCloseTo(1, 6)
    expect(result['B']).toBeCloseTo(-1, 6)
  })
})
