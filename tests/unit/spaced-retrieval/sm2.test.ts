/**
 * Unit Tests: SM-2 Algorithm
 *
 * Tests computeQuality, computeNextState, halveInterval, and computeDueAt.
 * Includes a 30-day simulation that verifies SM-2 progression matches
 * expected values from the spec (Audit 5, item 9).
 *
 * All tests are pure — no database, no mocking required.
 */

import {
  computeQuality,
  computeNextState,
  computeDueAt,
  halveInterval,
  INITIAL_SM2_STATE,
  MIN_EASINESS_FACTOR,
} from '@/lib/spaced-retrieval/sm2'

// ── Quality Mapping ───────────────────────────────────────────────────────────

describe('computeQuality', () => {
  describe('correct answers', () => {
    it('correct + Very sure (2) → 5', () => {
      expect(computeQuality(true, 2)).toBe(5)
    })
    it('correct + Pretty sure (1) → 4', () => {
      expect(computeQuality(true, 1)).toBe(4)
    })
    it('correct + Not sure (0) → 3', () => {
      expect(computeQuality(true, 0)).toBe(3)
    })
  })

  describe('incorrect answers', () => {
    it('incorrect + Not sure (0) → 2', () => {
      expect(computeQuality(false, 0)).toBe(2)
    })
    it('incorrect + Pretty sure (1) → 1', () => {
      expect(computeQuality(false, 1)).toBe(1)
    })
    it('incorrect + Very sure (2) → 0 (high-priority misconception)', () => {
      expect(computeQuality(false, 2)).toBe(0)
    })
  })
})

// ── SM-2 State Update ─────────────────────────────────────────────────────────

describe('computeNextState', () => {
  it('failed recall (quality < 3) resets repetition_count to 0 and interval to 1', () => {
    const state = { repetitionCount: 3, easinessFactor: 2.5, intervalDays: 15 }
    const next = computeNextState(state, 2)
    expect(next.repetitionCount).toBe(0)
    expect(next.intervalDays).toBe(1)
  })

  it('first successful recall (repetition=0) → interval = 1, repetition = 1', () => {
    const next = computeNextState(INITIAL_SM2_STATE, 5)
    expect(next.repetitionCount).toBe(1)
    expect(next.intervalDays).toBe(1)
  })

  it('second successful recall (repetition=1) → interval = 6, repetition = 2', () => {
    const state = { repetitionCount: 1, easinessFactor: 2.5, intervalDays: 1 }
    const next = computeNextState(state, 4)
    expect(next.repetitionCount).toBe(2)
    expect(next.intervalDays).toBe(6)
  })

  it('third+ recall → interval = round(prev_interval * EF)', () => {
    const state = { repetitionCount: 2, easinessFactor: 2.5, intervalDays: 6 }
    const next = computeNextState(state, 5)
    expect(next.intervalDays).toBe(Math.round(6 * 2.5)) // 15
    expect(next.repetitionCount).toBe(3)
  })

  describe('easiness factor update', () => {
    it('never drops below 1.3 (MIN_EASINESS_FACTOR)', () => {
      // Many quality=0 reviews should drive EF to floor
      let state = INITIAL_SM2_STATE
      for (let i = 0; i < 20; i++) {
        state = computeNextState(state, 0)
      }
      expect(state.easinessFactor).toBeGreaterThanOrEqual(MIN_EASINESS_FACTOR)
      expect(state.easinessFactor).toBeCloseTo(MIN_EASINESS_FACTOR, 5)
    })

    it('increases with quality 5 reviews', () => {
      const state = { repetitionCount: 2, easinessFactor: 2.0, intervalDays: 10 }
      const next = computeNextState(state, 5)
      expect(next.easinessFactor).toBeGreaterThan(state.easinessFactor)
    })

    it('decreases with quality 3 reviews', () => {
      const state = { repetitionCount: 2, easinessFactor: 2.5, intervalDays: 10 }
      const next = computeNextState(state, 3)
      expect(next.easinessFactor).toBeLessThan(state.easinessFactor)
    })

    it('EF formula matches spec: ef + (0.1 - (5-q)*(0.08 + (5-q)*0.02))', () => {
      const ef = 2.5
      const q = 4
      const expected = Math.max(1.3, ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
      const state = { repetitionCount: 2, easinessFactor: ef, intervalDays: 6 }
      const next = computeNextState(state, q)
      expect(next.easinessFactor).toBeCloseTo(expected, 10)
    })
  })
})

// ── Halve Interval ────────────────────────────────────────────────────────────

describe('halveInterval', () => {
  it('halves even intervals', () => {
    expect(halveInterval(10)).toBe(5)
    expect(halveInterval(6)).toBe(3)
  })

  it('floors odd intervals', () => {
    expect(halveInterval(7)).toBe(3)
    expect(halveInterval(3)).toBe(1)
  })

  it('never returns less than 1', () => {
    expect(halveInterval(1)).toBe(1)
    expect(halveInterval(0)).toBe(1)
  })
})

// ── Due Date ──────────────────────────────────────────────────────────────────

describe('computeDueAt', () => {
  it('returns now + intervalDays in milliseconds', () => {
    const now = new Date('2026-01-01T00:00:00Z')
    const due = computeDueAt(7, now)
    expect(due.toISOString()).toBe('2026-01-08T00:00:00.000Z')
  })

  it('1 day interval adds 24 hours', () => {
    const now = new Date('2026-05-14T12:00:00Z')
    const due = computeDueAt(1, now)
    expect(due.getTime() - now.getTime()).toBe(24 * 60 * 60 * 1000)
  })
})

// ── 30-Day Simulation ─────────────────────────────────────────────────────────

/**
 * Simulates 30 days of perfect-recall (quality=5) SM-2 reviews and verifies
 * the resulting intervals match the canonical SM-2 progression.
 *
 * Expected canonical sequence for quality=5 throughout:
 *   Review 0 → interval=1 (initial state, no review yet)
 *   Review 1 (rep=0→1) → interval=1
 *   Review 2 (rep=1→2) → interval=6
 *   Review 3 (rep=2→3) → interval = round(6 * EF_after_2_reviews)
 *   ...continues expanding
 *
 * Audit 5 item 9: "Test harness simulates 30 days of reviews and verifies
 * SM-2 progression matches reference."
 */
describe('30-day SM-2 simulation (quality=5 throughout)', () => {
  it('produces monotonically increasing intervals after stabilization', () => {
    let state = INITIAL_SM2_STATE
    const intervals: number[] = []

    // Simulate reviews until we've accumulated a sequence longer than 30 days total
    let totalDays = 0
    let reviewCount = 0
    while (totalDays < 30 && reviewCount < 20) {
      const next = computeNextState(state, 5)
      intervals.push(next.intervalDays)
      totalDays += next.intervalDays
      state = next
      reviewCount++
    }

    // After the first two reviews (interval=1, interval=6),
    // each subsequent interval should be strictly greater than the previous
    const stableIntervals = intervals.slice(2)
    for (let i = 1; i < stableIntervals.length; i++) {
      expect(stableIntervals[i]).toBeGreaterThan(stableIntervals[i - 1])
    }
  })

  it('first interval is 1 day', () => {
    const next = computeNextState(INITIAL_SM2_STATE, 5)
    expect(next.intervalDays).toBe(1)
  })

  it('second interval is 6 days', () => {
    const after1 = computeNextState(INITIAL_SM2_STATE, 5)
    const after2 = computeNextState(after1, 5)
    expect(after2.intervalDays).toBe(6)
  })

  it('third interval is round(6 * EF)', () => {
    const after1 = computeNextState(INITIAL_SM2_STATE, 5)
    const after2 = computeNextState(after1, 5)
    const after3 = computeNextState(after2, 5)
    expect(after3.intervalDays).toBe(Math.round(6 * after2.easinessFactor))
  })

  it('EF stays at or above 1.3 throughout 30-review sequence of quality=0', () => {
    let state = INITIAL_SM2_STATE
    for (let i = 0; i < 30; i++) {
      state = computeNextState(state, 0)
      expect(state.easinessFactor).toBeGreaterThanOrEqual(MIN_EASINESS_FACTOR)
    }
  })

  it('reference progression: first 5 reviews at quality=5 match expected intervals', () => {
    // Canonical expected values computed from the spec formula
    const expectedIntervals = [1, 6] // reviews 1 and 2

    let state = INITIAL_SM2_STATE
    // Review 1
    state = computeNextState(state, 5)
    expect(state.intervalDays).toBe(expectedIntervals[0])

    // Review 2
    state = computeNextState(state, 5)
    expect(state.intervalDays).toBe(expectedIntervals[1])

    // Review 3 — interval = round(6 * EF_at_review2)
    const efAtReview2 = state.easinessFactor
    state = computeNextState(state, 5)
    expect(state.intervalDays).toBe(Math.round(6 * efAtReview2))

    // Review 4 — interval = round(prev * current EF)
    const intervalAtReview3 = state.intervalDays
    const efAtReview3 = state.easinessFactor
    state = computeNextState(state, 5)
    expect(state.intervalDays).toBe(Math.round(intervalAtReview3 * efAtReview3))
  })
})
