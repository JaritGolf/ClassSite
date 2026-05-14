/**
 * Adaptive Difficulty State Machine — Pure Transitions
 *
 * All functions are pure (no DB, no side effects). This makes them
 * directly unit-testable and lets the DB layer call them without coupling.
 *
 * Rules (spec Section 18.1):
 *   - 3 consecutive correct → bump complexity UP, reset counters
 *   - 3 consecutive incorrect → bump complexity DOWN, set pendingWorkedExample
 *   - Near-transfer correct → clear pending flag, resume normal progression
 *   - Near-transfer incorrect → clear pending flag, flag for remediation escalation
 *   - Session always starts at LOW with all counters at 0
 *
 * Complexity order: LOW < MODERATE < HIGH
 */

import type { CognitiveComplexity } from '@prisma/client'

// ── Threshold ──────────────────────────────────────────────────────────────
export const CONSECUTIVE_THRESHOLD = 3

// ── State shape ────────────────────────────────────────────────────────────

export interface AdaptiveState {
  currentComplexity: CognitiveComplexity
  consecutiveCorrect: number
  consecutiveIncorrect: number
  pendingWorkedExample: boolean
  pendingNearTransfer: boolean
  workedExampleQuestionId: string | null
}

export const initialState: AdaptiveState = {
  currentComplexity: 'LOW',
  consecutiveCorrect: 0,
  consecutiveIncorrect: 0,
  pendingWorkedExample: false,
  pendingNearTransfer: false,
  workedExampleQuestionId: null,
}

// ── Result of applying a near-transfer answer ──────────────────────────────

export interface NearTransferResult {
  state: AdaptiveState
  /** true when remediation should be assigned (near-transfer was wrong) */
  escalateToRemediation: boolean
}

// ── Complexity ladder helpers ──────────────────────────────────────────────

/** Bump complexity up one level (stops at HIGH). */
export function complexityUp(c: CognitiveComplexity): CognitiveComplexity {
  if (c === 'LOW') return 'MODERATE'
  if (c === 'MODERATE') return 'HIGH'
  return 'HIGH'
}

/** Bump complexity down one level (stops at LOW). */
export function complexityDown(c: CognitiveComplexity): CognitiveComplexity {
  if (c === 'HIGH') return 'MODERATE'
  if (c === 'MODERATE') return 'LOW'
  return 'LOW'
}

// ── Main transition functions ──────────────────────────────────────────────

/**
 * Apply a correct answer during normal (non-near-transfer) progression.
 * At CONSECUTIVE_THRESHOLD correct in a row → bump complexity up.
 */
export function applyCorrectAnswer(state: AdaptiveState): AdaptiveState {
  const nextConsecutiveCorrect = state.consecutiveCorrect + 1

  if (nextConsecutiveCorrect >= CONSECUTIVE_THRESHOLD) {
    // Bump up, reset both counters
    return {
      ...state,
      currentComplexity: complexityUp(state.currentComplexity),
      consecutiveCorrect: 0,
      consecutiveIncorrect: 0,
      pendingWorkedExample: false,
      pendingNearTransfer: false,
    }
  }

  return {
    ...state,
    consecutiveCorrect: nextConsecutiveCorrect,
    consecutiveIncorrect: 0, // any correct resets the incorrect streak
  }
}

/**
 * Apply an incorrect answer during normal progression.
 * At CONSECUTIVE_THRESHOLD incorrect in a row → bump complexity down
 * and set pendingWorkedExample.
 *
 * @param questionId - The question that was answered incorrectly (stored as
 *                     workedExampleQuestionId when threshold is reached)
 */
export function applyIncorrectAnswer(
  state: AdaptiveState,
  questionId: string
): AdaptiveState {
  const nextConsecutiveIncorrect = state.consecutiveIncorrect + 1

  if (nextConsecutiveIncorrect >= CONSECUTIVE_THRESHOLD) {
    // Bump down, flag worked example
    return {
      ...state,
      currentComplexity: complexityDown(state.currentComplexity),
      consecutiveCorrect: 0,
      consecutiveIncorrect: 0,
      pendingWorkedExample: true,
      pendingNearTransfer: false,
      workedExampleQuestionId: questionId,
    }
  }

  return {
    ...state,
    consecutiveIncorrect: nextConsecutiveIncorrect,
    consecutiveCorrect: 0, // any incorrect resets the correct streak
  }
}

/**
 * Transition FROM pendingWorkedExample TO pendingNearTransfer.
 * Called when the worked example has been delivered to the student.
 */
export function acknowledgeWorkedExample(state: AdaptiveState): AdaptiveState {
  return {
    ...state,
    pendingWorkedExample: false,
    pendingNearTransfer: true,
  }
}

/**
 * Apply a correct answer on the near-transfer item.
 * → Resume normal progression with reset counters.
 */
export function applyNearTransferCorrect(state: AdaptiveState): NearTransferResult {
  return {
    state: {
      ...state,
      consecutiveCorrect: 0,
      consecutiveIncorrect: 0,
      pendingWorkedExample: false,
      pendingNearTransfer: false,
      workedExampleQuestionId: null,
    },
    escalateToRemediation: false,
  }
}

/**
 * Apply an incorrect answer on the near-transfer item.
 * → Clear the near-transfer flag and escalate to remediation.
 */
export function applyNearTransferIncorrect(state: AdaptiveState): NearTransferResult {
  return {
    state: {
      ...state,
      consecutiveCorrect: 0,
      consecutiveIncorrect: 0,
      pendingWorkedExample: false,
      pendingNearTransfer: false,
      workedExampleQuestionId: null,
    },
    escalateToRemediation: true,
  }
}
