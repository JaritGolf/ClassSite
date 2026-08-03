/**
 * Suggestion Box — status transition matrix (pure).
 *
 * The full 4x4 grid is asserted explicitly rather than derived from the same
 * constant the implementation uses — a test that recomputes from the source of
 * truth can't catch a change to that source of truth.
 */

import type { SuggestionStatus } from '@prisma/client'
import { canTransition, SUGGESTION_STATUS_LABELS } from '@/lib/suggestions/status'

const ALL: SuggestionStatus[] = ['NEW', 'IN_REVIEW', 'RESOLVED', 'DISMISSED']

/** true where the transition must be legal. Rows = from, columns = to. */
const EXPECTED: Record<SuggestionStatus, Record<SuggestionStatus, boolean>> = {
  NEW: { NEW: false, IN_REVIEW: true, RESOLVED: true, DISMISSED: true },
  IN_REVIEW: { NEW: false, IN_REVIEW: false, RESOLVED: true, DISMISSED: true },
  RESOLVED: { NEW: false, IN_REVIEW: true, RESOLVED: false, DISMISSED: false },
  DISMISSED: { NEW: false, IN_REVIEW: true, RESOLVED: false, DISMISSED: false },
}

describe('canTransition — full matrix', () => {
  for (const from of ALL) {
    for (const to of ALL) {
      const expected = EXPECTED[from][to]
      it(`${from} -> ${to} is ${expected ? 'allowed' : 'rejected'}`, () => {
        expect(canTransition(from, to)).toBe(expected)
      })
    }
  }
})

describe('canTransition — invariants', () => {
  it('rejects every no-op (a no-op PATCH must not write an audit row)', () => {
    for (const s of ALL) expect(canTransition(s, s)).toBe(false)
  })

  it('never allows a return to NEW — NEW is creation-only', () => {
    for (const from of ALL) expect(canTransition(from, 'NEW')).toBe(false)
  })

  it('reopens closed items only through IN_REVIEW, so the trail shows the reopen', () => {
    expect(canTransition('RESOLVED', 'IN_REVIEW')).toBe(true)
    expect(canTransition('DISMISSED', 'IN_REVIEW')).toBe(true)
    expect(canTransition('RESOLVED', 'DISMISSED')).toBe(false)
    expect(canTransition('DISMISSED', 'RESOLVED')).toBe(false)
  })
})

describe('SUGGESTION_STATUS_LABELS', () => {
  it('labels every status', () => {
    for (const s of ALL) {
      expect(SUGGESTION_STATUS_LABELS[s]).toBeTruthy()
    }
  })
})
