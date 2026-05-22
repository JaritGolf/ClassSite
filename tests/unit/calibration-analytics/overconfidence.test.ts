/**
 * Unit Tests: Calibration Analytics — Overconfidence threshold logic
 *
 * Tests pure threshold computation:
 *   gap = 1.0 - highConfidenceAccuracy
 *   overconfident if gap >= threshold (default 0.3)
 *   minimum 5 high-confidence responses required
 */

// ── Pure threshold logic (mirrors production code) ────────────────────────────

const MIN_SAMPLE = 5
const DEFAULT_THRESHOLD = 0.3

interface HighConfStats {
  correct: number
  total: number
}

function isOverconfident(stats: HighConfStats, threshold = DEFAULT_THRESHOLD): boolean {
  if (stats.total < MIN_SAMPLE) return false
  const accuracy = stats.correct / stats.total
  const gap = 1.0 - accuracy
  return gap >= threshold
}

function computeGap(stats: HighConfStats): number {
  if (stats.total === 0) return 0
  return 1.0 - stats.correct / stats.total
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('overconfidence threshold', () => {
  it('flags student with gap exactly at threshold (0.3)', () => {
    // 7/10 correct → gap = 0.3
    expect(isOverconfident({ correct: 7, total: 10 })).toBe(true)
  })

  it('flags student with gap above threshold', () => {
    // 4/10 correct → gap = 0.6
    expect(isOverconfident({ correct: 4, total: 10 })).toBe(true)
  })

  it('does NOT flag student with gap below threshold', () => {
    // 8/10 correct → gap = 0.2
    expect(isOverconfident({ correct: 8, total: 10 })).toBe(false)
  })

  it('does NOT flag student with fewer than 5 responses (insufficient data)', () => {
    // 0/4 correct → would be gap=1.0 but sample too small
    expect(isOverconfident({ correct: 0, total: 4 })).toBe(false)
  })

  it('flags student with exactly 5 responses at threshold', () => {
    // 3.5 → not integer; use 2/5 = gap 0.6
    expect(isOverconfident({ correct: 2, total: 5 })).toBe(true)
  })

  it('perfect calibration (all correct) is never flagged', () => {
    expect(isOverconfident({ correct: 20, total: 20 })).toBe(false)
  })

  it('custom threshold 0.5 — only flags severe overconfidence', () => {
    // gap=0.3 should NOT be flagged with threshold=0.5
    expect(isOverconfident({ correct: 7, total: 10 }, 0.5)).toBe(false)
    // gap=0.6 SHOULD be flagged with threshold=0.5
    expect(isOverconfident({ correct: 4, total: 10 }, 0.5)).toBe(true)
  })

  it('gap computation is correct', () => {
    expect(computeGap({ correct: 7, total: 10 })).toBeCloseTo(0.3, 5)
    expect(computeGap({ correct: 10, total: 10 })).toBe(0)
    expect(computeGap({ correct: 0, total: 10 })).toBe(1.0)
    expect(computeGap({ correct: 0, total: 0 })).toBe(0)
  })

  it('default threshold is 0.3', () => {
    expect(DEFAULT_THRESHOLD).toBe(0.3)
  })

  it('minimum sample size is 5', () => {
    expect(MIN_SAMPLE).toBe(5)
  })
})
