/**
 * Adaptive Session State — DB operations
 *
 * Manages AdaptiveSessionState rows. Only created for PRACTICE/SCENARIO
 * sessions — never for MASTERY_CHALLENGE (fixed-form rule, Audit 6 item 4).
 */

import { prisma } from '@/lib/db'
import type { AdaptiveState } from './transitions'
import { initialState } from './transitions'

// Assessment types that get adaptive difficulty
const ADAPTIVE_ASSESSMENT_TYPES = new Set([
  'PRACTICE',
  'DIAGNOSTIC',
  'READINESS_CHECK',
])

/**
 * Initialize an adaptive session for a PRACTICE/SCENARIO attempt.
 * No-op (returns null) for Mastery Challenges and other fixed-form types.
 *
 * @param attemptId - The AssessmentAttempt.id
 * @returns The created state, or null if this assessment type doesn't use adaptation
 */
export async function initSession(attemptId: string): Promise<AdaptiveState | null> {
  // Load assessment type to decide whether to create a state row
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    select: { assessment: { select: { assessmentType: true } } },
  })

  if (!attempt) return null

  if (!ADAPTIVE_ASSESSMENT_TYPES.has(attempt.assessment.assessmentType)) {
    // Mastery Challenge and other fixed-form types → no adaptive state
    return null
  }

  const row = await prisma.adaptiveSessionState.upsert({
    where: { attemptId },
    create: {
      attemptId,
      currentComplexity: initialState.currentComplexity,
      consecutiveCorrect: initialState.consecutiveCorrect,
      consecutiveIncorrect: initialState.consecutiveIncorrect,
      pendingWorkedExample: initialState.pendingWorkedExample,
      pendingNearTransfer: initialState.pendingNearTransfer,
      workedExampleQuestionId: initialState.workedExampleQuestionId,
    },
    update: {}, // already exists — don't overwrite
  })

  return rowToState(row)
}

/**
 * Load the current adaptive state for an attempt.
 * Returns null if no state exists (e.g., Mastery Challenge, or not yet initialized).
 */
export async function getSessionState(attemptId: string): Promise<AdaptiveState | null> {
  const row = await prisma.adaptiveSessionState.findUnique({
    where: { attemptId },
  })

  return row ? rowToState(row) : null
}

/**
 * Persist an updated adaptive state for an attempt.
 */
export async function saveSessionState(
  attemptId: string,
  state: AdaptiveState
): Promise<void> {
  await prisma.adaptiveSessionState.upsert({
    where: { attemptId },
    create: {
      attemptId,
      currentComplexity: state.currentComplexity,
      consecutiveCorrect: state.consecutiveCorrect,
      consecutiveIncorrect: state.consecutiveIncorrect,
      pendingWorkedExample: state.pendingWorkedExample,
      pendingNearTransfer: state.pendingNearTransfer,
      workedExampleQuestionId: state.workedExampleQuestionId,
    },
    update: {
      currentComplexity: state.currentComplexity,
      consecutiveCorrect: state.consecutiveCorrect,
      consecutiveIncorrect: state.consecutiveIncorrect,
      pendingWorkedExample: state.pendingWorkedExample,
      pendingNearTransfer: state.pendingNearTransfer,
      workedExampleQuestionId: state.workedExampleQuestionId,
    },
  })
}

// ── Mapper ─────────────────────────────────────────────────────────────────

function rowToState(row: {
  currentComplexity: string
  consecutiveCorrect: number
  consecutiveIncorrect: number
  pendingWorkedExample: boolean
  pendingNearTransfer: boolean
  workedExampleQuestionId: string | null
}): AdaptiveState {
  return {
    currentComplexity: row.currentComplexity as AdaptiveState['currentComplexity'],
    consecutiveCorrect: row.consecutiveCorrect,
    consecutiveIncorrect: row.consecutiveIncorrect,
    pendingWorkedExample: row.pendingWorkedExample,
    pendingNearTransfer: row.pendingNearTransfer,
    workedExampleQuestionId: row.workedExampleQuestionId,
  }
}
