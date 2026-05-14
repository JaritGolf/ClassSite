/**
 * Unit Tests — Adaptive Difficulty Pure Transitions
 *
 * No DB, no Prisma. Tests the pure state machine functions only.
 * Covers all 5 Audit 6 items through pure logic verification.
 */

import {
  complexityUp,
  complexityDown,
  applyCorrectAnswer,
  applyIncorrectAnswer,
  acknowledgeWorkedExample,
  applyNearTransferCorrect,
  applyNearTransferIncorrect,
  initialState,
  CONSECUTIVE_THRESHOLD,
} from '@/lib/adaptive-difficulty/transitions'
import type { AdaptiveState } from '@/lib/adaptive-difficulty/transitions'

const FAKE_Q_ID = 'ckabcdefghijklmnopqr00001'

// ── Complexity helpers ─────────────────────────────────────────────────────

describe('complexityUp', () => {
  it('LOW → MODERATE', () => expect(complexityUp('LOW')).toBe('MODERATE'))
  it('MODERATE → HIGH', () => expect(complexityUp('MODERATE')).toBe('HIGH'))
  it('HIGH stays HIGH (ceiling)', () => expect(complexityUp('HIGH')).toBe('HIGH'))
})

describe('complexityDown', () => {
  it('HIGH → MODERATE', () => expect(complexityDown('HIGH')).toBe('MODERATE'))
  it('MODERATE → LOW', () => expect(complexityDown('MODERATE')).toBe('LOW'))
  it('LOW stays LOW (floor)', () => expect(complexityDown('LOW')).toBe('LOW'))
})

// ── Consecutive threshold ──────────────────────────────────────────────────

describe('CONSECUTIVE_THRESHOLD', () => {
  it('is 3 per spec Section 18.1', () => expect(CONSECUTIVE_THRESHOLD).toBe(3))
})

// ── initialState ───────────────────────────────────────────────────────────

describe('initialState', () => {
  it('starts at LOW complexity', () => expect(initialState.currentComplexity).toBe('LOW'))
  it('starts with 0 consecutive correct', () => expect(initialState.consecutiveCorrect).toBe(0))
  it('starts with 0 consecutive incorrect', () => expect(initialState.consecutiveIncorrect).toBe(0))
  it('starts with no pending worked example', () => expect(initialState.pendingWorkedExample).toBe(false))
  it('starts with no pending near transfer', () => expect(initialState.pendingNearTransfer).toBe(false))
})

// ── applyCorrectAnswer (Audit 6 item 1) ───────────────────────────────────

describe('applyCorrectAnswer — Audit 6 item 1', () => {
  it('increments consecutiveCorrect from 0 to 1', () => {
    const next = applyCorrectAnswer(initialState)
    expect(next.consecutiveCorrect).toBe(1)
  })

  it('resets consecutiveIncorrect to 0 on any correct answer', () => {
    const state: AdaptiveState = { ...initialState, consecutiveIncorrect: 2 }
    const next = applyCorrectAnswer(state)
    expect(next.consecutiveIncorrect).toBe(0)
  })

  it('does NOT bump complexity at count=1', () => {
    const next = applyCorrectAnswer(initialState)
    expect(next.currentComplexity).toBe('LOW')
  })

  it('does NOT bump complexity at count=2', () => {
    const state: AdaptiveState = { ...initialState, consecutiveCorrect: 1 }
    const next = applyCorrectAnswer(state)
    expect(next.currentComplexity).toBe('LOW')
    expect(next.consecutiveCorrect).toBe(2)
  })

  it('bumps complexity UP at count=3 (threshold reached)', () => {
    const state: AdaptiveState = { ...initialState, consecutiveCorrect: 2 }
    const next = applyCorrectAnswer(state)
    expect(next.currentComplexity).toBe('MODERATE') // LOW → MODERATE
    expect(next.consecutiveCorrect).toBe(0)          // reset
    expect(next.consecutiveIncorrect).toBe(0)
  })

  it('bumps MODERATE → HIGH at threshold', () => {
    const state: AdaptiveState = {
      ...initialState,
      currentComplexity: 'MODERATE',
      consecutiveCorrect: 2,
    }
    const next = applyCorrectAnswer(state)
    expect(next.currentComplexity).toBe('HIGH')
  })

  it('stays at HIGH when already at ceiling and threshold reached', () => {
    const state: AdaptiveState = {
      ...initialState,
      currentComplexity: 'HIGH',
      consecutiveCorrect: 2,
    }
    const next = applyCorrectAnswer(state)
    expect(next.currentComplexity).toBe('HIGH') // ceiling — no change
    expect(next.consecutiveCorrect).toBe(0)      // counter still resets
  })
})

// ── applyIncorrectAnswer (Audit 6 item 2) ─────────────────────────────────

describe('applyIncorrectAnswer — Audit 6 item 2', () => {
  it('increments consecutiveIncorrect from 0 to 1', () => {
    const next = applyIncorrectAnswer(initialState, FAKE_Q_ID)
    expect(next.consecutiveIncorrect).toBe(1)
  })

  it('resets consecutiveCorrect to 0 on any incorrect answer', () => {
    const state: AdaptiveState = { ...initialState, consecutiveCorrect: 2 }
    const next = applyIncorrectAnswer(state, FAKE_Q_ID)
    expect(next.consecutiveCorrect).toBe(0)
  })

  it('does NOT trigger worked example at count=1', () => {
    const next = applyIncorrectAnswer(initialState, FAKE_Q_ID)
    expect(next.pendingWorkedExample).toBe(false)
  })

  it('does NOT trigger worked example at count=2', () => {
    const state: AdaptiveState = { ...initialState, consecutiveIncorrect: 1 }
    const next = applyIncorrectAnswer(state, FAKE_Q_ID)
    expect(next.pendingWorkedExample).toBe(false)
    expect(next.consecutiveIncorrect).toBe(2)
  })

  it('triggers worked example AND bumps complexity down at count=3', () => {
    const state: AdaptiveState = {
      ...initialState,
      currentComplexity: 'MODERATE',
      consecutiveIncorrect: 2,
    }
    const next = applyIncorrectAnswer(state, FAKE_Q_ID)
    expect(next.pendingWorkedExample).toBe(true)
    expect(next.currentComplexity).toBe('LOW') // MODERATE → LOW
    expect(next.consecutiveIncorrect).toBe(0)   // reset
    expect(next.workedExampleQuestionId).toBe(FAKE_Q_ID)
  })

  it('bumps HIGH → MODERATE at threshold', () => {
    const state: AdaptiveState = {
      ...initialState,
      currentComplexity: 'HIGH',
      consecutiveIncorrect: 2,
    }
    const next = applyIncorrectAnswer(state, FAKE_Q_ID)
    expect(next.currentComplexity).toBe('MODERATE')
    expect(next.pendingWorkedExample).toBe(true)
  })

  it('stays at LOW when already at floor and threshold reached', () => {
    const state: AdaptiveState = {
      ...initialState,
      currentComplexity: 'LOW',
      consecutiveIncorrect: 2,
    }
    const next = applyIncorrectAnswer(state, FAKE_Q_ID)
    expect(next.currentComplexity).toBe('LOW') // floor — no change
    expect(next.pendingWorkedExample).toBe(true)
  })
})

// ── acknowledgeWorkedExample (Audit 6 item 3) ─────────────────────────────

describe('acknowledgeWorkedExample', () => {
  it('clears pendingWorkedExample and sets pendingNearTransfer', () => {
    const state: AdaptiveState = {
      ...initialState,
      pendingWorkedExample: true,
      workedExampleQuestionId: FAKE_Q_ID,
    }
    const next = acknowledgeWorkedExample(state)
    expect(next.pendingWorkedExample).toBe(false)
    expect(next.pendingNearTransfer).toBe(true)
    expect(next.workedExampleQuestionId).toBe(FAKE_Q_ID) // preserved for near-transfer context
  })
})

// ── applyNearTransferCorrect (Audit 6 item 3) ─────────────────────────────

describe('applyNearTransferCorrect — Audit 6 item 3', () => {
  const nearTransferState: AdaptiveState = {
    ...initialState,
    pendingNearTransfer: true,
    workedExampleQuestionId: FAKE_Q_ID,
  }

  it('clears pendingNearTransfer', () => {
    const { state } = applyNearTransferCorrect(nearTransferState)
    expect(state.pendingNearTransfer).toBe(false)
  })

  it('resets counters', () => {
    const { state } = applyNearTransferCorrect(nearTransferState)
    expect(state.consecutiveCorrect).toBe(0)
    expect(state.consecutiveIncorrect).toBe(0)
  })

  it('clears workedExampleQuestionId', () => {
    const { state } = applyNearTransferCorrect(nearTransferState)
    expect(state.workedExampleQuestionId).toBeNull()
  })

  it('does NOT escalate to remediation', () => {
    const { escalateToRemediation } = applyNearTransferCorrect(nearTransferState)
    expect(escalateToRemediation).toBe(false)
  })

  it('preserves current complexity (near-transfer does not change complexity)', () => {
    const state: AdaptiveState = { ...nearTransferState, currentComplexity: 'MODERATE' }
    const { state: next } = applyNearTransferCorrect(state)
    expect(next.currentComplexity).toBe('MODERATE')
  })
})

// ── applyNearTransferIncorrect (Audit 6 item 3) ───────────────────────────

describe('applyNearTransferIncorrect — Audit 6 item 3', () => {
  const nearTransferState: AdaptiveState = {
    ...initialState,
    pendingNearTransfer: true,
    workedExampleQuestionId: FAKE_Q_ID,
  }

  it('clears pendingNearTransfer', () => {
    const { state } = applyNearTransferIncorrect(nearTransferState)
    expect(state.pendingNearTransfer).toBe(false)
  })

  it('escalates to remediation', () => {
    const { escalateToRemediation } = applyNearTransferIncorrect(nearTransferState)
    expect(escalateToRemediation).toBe(true)
  })

  it('resets counters', () => {
    const { state } = applyNearTransferIncorrect(nearTransferState)
    expect(state.consecutiveCorrect).toBe(0)
    expect(state.consecutiveIncorrect).toBe(0)
  })

  it('clears workedExampleQuestionId', () => {
    const { state } = applyNearTransferIncorrect(nearTransferState)
    expect(state.workedExampleQuestionId).toBeNull()
  })
})

// ── Session reset (Audit 6 item 5) — pure state verification ──────────────

describe('Session state isolation (Audit 6 item 5 — pure aspect)', () => {
  it('initialState is always fresh (not mutated by transitions)', () => {
    // Apply several transitions
    const s1 = applyCorrectAnswer(initialState)
    const s2 = applyCorrectAnswer(s1)
    const s3 = applyCorrectAnswer(s2) // triggers bump

    // initialState must be unchanged
    expect(initialState.consecutiveCorrect).toBe(0)
    expect(initialState.currentComplexity).toBe('LOW')

    // s3 should have bumped up
    expect(s3.currentComplexity).toBe('MODERATE')
  })

  it('transitions produce new objects (immutable pattern)', () => {
    const next = applyCorrectAnswer(initialState)
    expect(next).not.toBe(initialState)
  })
})
