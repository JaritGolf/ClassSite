/**
 * Pearson Correlation — Pure Functions
 *
 * No DB, no side effects. Used by calibration-run.ts to compute
 * correlation between EOC readiness metrics and actual score outcomes.
 *
 * Returns NaN for undefined cases (n<2, zero variance) rather than throwing,
 * so callers can safely filter or substitute 0.
 *
 * Spec reference: Section 20.5 (Calibration Feedback Loop)
 */

/**
 * Pearson product-moment correlation coefficient.
 *
 * r = sum((x - meanX)(y - meanY)) / sqrt(sum((x-meanX)^2) * sum((y-meanY)^2))
 *
 * Returns NaN when:
 *   - xs or ys has length < 2 (undefined for n<2)
 *   - xs and ys have different lengths
 *   - either array has zero variance (division by sqrt(0))
 */
export function pearsonCorrelation(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length) return NaN
  const n = xs.length
  if (n < 2) return NaN

  const meanX = xs.reduce((s, x) => s + x, 0) / n
  const meanY = ys.reduce((s, y) => s + y, 0) / n

  let cov = 0
  let varX = 0
  let varY = 0

  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX
    const dy = ys[i] - meanY
    cov += dx * dy
    varX += dx * dx
    varY += dy * dy
  }

  const denom = Math.sqrt(varX * varY)
  if (denom === 0) return NaN

  return cov / denom
}

/**
 * Compute Pearson correlation for each unique bucket value.
 *
 * Rows with the same `bucket` are grouped. Buckets with fewer than 2 pairs
 * get NaN (not enough data). The caller (calibration-run.ts) treats NaN
 * as 0 for weight-recommendation purposes; the clamp [0.10, 0.40] prevents
 * NaN propagation into the final weights.
 */
export function correlationByBucket(
  rows: Array<{ bucket: string; x: number; y: number }>
): Record<string, number> {
  // Group by bucket
  const groups = new Map<string, { xs: number[]; ys: number[] }>()
  for (const row of rows) {
    const entry = groups.get(row.bucket) ?? { xs: [], ys: [] }
    entry.xs.push(row.x)
    entry.ys.push(row.y)
    groups.set(row.bucket, entry)
  }

  const result: Record<string, number> = {}
  for (const [bucket, { xs, ys }] of groups.entries()) {
    result[bucket] = pearsonCorrelation(xs, ys)
  }
  return result
}
