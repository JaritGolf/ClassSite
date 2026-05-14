/**
 * Unit Tests — Mastery Engine Pure Functions
 *
 * Tests the pure, side-effect-free helpers from the mastery and remediation
 * engines. No DB, no Prisma — these run without any infrastructure.
 *
 * Covers:
 *   - selectRemediationType (confidence routing per spec Section 17.5)
 *   - isOffRampConditionMet (off-ramp gate logic per spec Section 12.4)
 */

import { selectRemediationType } from '@/lib/remediation/assign'
import { isOffRampConditionMet } from '@/lib/mastery/off-ramp'

// ── selectRemediationType ─────────────────────────────────────────────────────

describe('selectRemediationType — confidence routing (Audit 4 item 6)', () => {
  it('high confidence (2) + wrong, with misconception → MISCONCEPTION_FIX', () => {
    expect(selectRemediationType(2, true)).toBe('MISCONCEPTION_FIX')
  })

  it('high confidence (2) + wrong, without misconception → MISCONCEPTION_FIX', () => {
    // Even without a specific misconception, high confidence + wrong always routes to fix
    expect(selectRemediationType(2, false)).toBe('MISCONCEPTION_FIX')
  })

  it('low confidence (0) + wrong, with misconception → MINI_LESSON_REPLAY', () => {
    expect(selectRemediationType(0, true)).toBe('MINI_LESSON_REPLAY')
  })

  it('low confidence (0) + wrong, without misconception → BASIC_RETEACH', () => {
    expect(selectRemediationType(0, false)).toBe('BASIC_RETEACH')
  })

  it('medium confidence (1) + wrong, without misconception → BASIC_RETEACH', () => {
    expect(selectRemediationType(1, false)).toBe('BASIC_RETEACH')
  })

  it('medium confidence (1) + wrong, with misconception → MINI_LESSON_REPLAY', () => {
    expect(selectRemediationType(1, true)).toBe('MINI_LESSON_REPLAY')
  })

  it('null confidence + wrong, without misconception → BASIC_RETEACH (fallback)', () => {
    expect(selectRemediationType(null, false)).toBe('BASIC_RETEACH')
  })

  it('null confidence + wrong, with misconception → MINI_LESSON_REPLAY', () => {
    // Null confidence + known misconception — replay the concept
    expect(selectRemediationType(null, true)).toBe('MINI_LESSON_REPLAY')
  })
})

// ── isOffRampConditionMet ─────────────────────────────────────────────────────

describe('isOffRampConditionMet — off-ramp gate logic (Audit 4 item 4)', () => {
  const now = new Date('2026-05-14T12:00:00.000Z')

  // Helper: create a date N days before `now`
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000)

  it('returns false with 0 failed attempts', () => {
    expect(isOffRampConditionMet(0, 1, daysAgo(10), now)).toBe(false)
  })

  it('returns false with 1 failed attempt', () => {
    expect(isOffRampConditionMet(1, 1, daysAgo(10), now)).toBe(false)
  })

  it('returns false with 2 failed attempts', () => {
    expect(isOffRampConditionMet(2, 1, daysAgo(10), now)).toBe(false)
  })

  it('returns false with 3 failed attempts but no completed remediation', () => {
    expect(isOffRampConditionMet(3, 0, daysAgo(10), now)).toBe(false)
  })

  it('returns false with 3 failed + remediation but only 5 days elapsed', () => {
    expect(isOffRampConditionMet(3, 1, daysAgo(5), now)).toBe(false)
  })

  it('returns false with 3 failed + remediation but exactly 6 days elapsed (< 7)', () => {
    // 6 days and 23 hours — just under the threshold
    const almostSeven = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000 - 1))
    expect(isOffRampConditionMet(3, 1, almostSeven, now)).toBe(false)
  })

  it('returns true with 3 failed + remediation + exactly 7 days elapsed', () => {
    const sevenDaysAgo = daysAgo(7)
    expect(isOffRampConditionMet(3, 1, sevenDaysAgo, now)).toBe(true)
  })

  it('returns true with 3 failed + remediation + more than 7 days elapsed', () => {
    expect(isOffRampConditionMet(3, 1, daysAgo(14), now)).toBe(true)
  })

  it('returns true with 5 failed attempts + remediation + 8 days elapsed', () => {
    // More than 3 failures still triggers
    expect(isOffRampConditionMet(5, 2, daysAgo(8), now)).toBe(true)
  })

  it('returns false when all three conditions are met except remediation count', () => {
    expect(isOffRampConditionMet(3, 0, daysAgo(8), now)).toBe(false)
  })
})
