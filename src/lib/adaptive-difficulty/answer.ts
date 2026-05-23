/**
 * Practice Answer Submission
 *
 * Handles one-at-a-time answer grading for adaptive practice sessions.
 * Grades server-side, writes AttemptResponse, updates AdaptiveSessionState,
 * and triggers remediation escalation when a near-transfer item is missed.
 *
 * This is intentionally separate from gradeAndSubmit() (batch Mastery Challenge
 * grading) — adaptive practice uses a streaming question-by-question flow.
 */

import { prisma } from '@/lib/db'
import { assignRemediation } from '@/lib/remediation'
import {
  applyCorrectAnswer,
  applyIncorrectAnswer,
  applyNearTransferCorrect,
  applyNearTransferIncorrect,
} from './transitions'
import { getSessionState, initSession, saveSessionState } from './session'
import type { CognitiveComplexity } from '@prisma/client'

// ── Error type ─────────────────────────────────────────────────────────────

export class AdaptiveError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'NOT_FOUND'
      | 'FORBIDDEN'
      | 'QUESTION_NOT_IN_BENCHMARK'
      | 'ALREADY_SUBMITTED'
  ) {
    super(message)
    this.name = 'AdaptiveError'
  }
}

// ── Result types ───────────────────────────────────────────────────────────

export type NextAction =
  | 'NEXT_QUESTION'
  | 'WORKED_EXAMPLE'
  | 'NEAR_TRANSFER'
  | 'REMEDIATION_ESCALATED'
  | 'SESSION_COMPLETE'

export interface AnswerResult {
  isCorrect: boolean
  nextAction: NextAction
  newComplexity: CognitiveComplexity
  remediationAssigned: boolean
}

// ── Main function ──────────────────────────────────────────────────────────

/**
 * Submit one answer in an adaptive practice session.
 *
 * Grades server-side from DB, writes AttemptResponse, transitions
 * AdaptiveSessionState, and returns what the client should do next.
 *
 * @param attemptId        - The AssessmentAttempt.id
 * @param questionId       - The Question.id being answered
 * @param selectedOptionId - The QuestionOption.id selected by the student
 * @param studentId        - The Student.id (for ownership verification)
 * @param confidence       - Optional 0/1/2 confidence rating
 * @param timeSeconds      - Optional time taken
 */
export async function submitPracticeAnswer(
  attemptId: string,
  questionId: string,
  selectedOptionId: string,
  studentId: string,
  confidence?: 0 | 1 | 2,
  timeSeconds?: number
): Promise<AnswerResult> {
  // 1. Verify attempt ownership and state
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    select: {
      studentId: true,
      submittedAt: true,
      assessment: { select: { benchmarkId: true } },
    },
  })

  if (!attempt) {
    throw new AdaptiveError(`Attempt ${attemptId} not found`, 'NOT_FOUND')
  }
  if (attempt.studentId !== studentId) {
    throw new AdaptiveError('This attempt does not belong to the current student', 'FORBIDDEN')
  }
  if (attempt.submittedAt !== null) {
    throw new AdaptiveError('This attempt has already been submitted', 'ALREADY_SUBMITTED')
  }

  // 2. Grade server-side: load correct option from DB
  const option = await prisma.questionOption.findUnique({
    where: { id: selectedOptionId },
    select: { isCorrect: true, questionId: true },
  })

  if (!option) {
    throw new AdaptiveError(`Option ${selectedOptionId} not found`, 'NOT_FOUND')
  }

  const isCorrect = option.isCorrect

  // 3. Write AttemptResponse
  await prisma.attemptResponse.create({
    data: {
      attemptId,
      questionId,
      responseJson: { selectedOptionId },
      selectedOptionId,
      isCorrect,
      pointsAwarded: isCorrect ? 1 : 0,
      confidence: confidence ?? null,
      timeSeconds: timeSeconds ?? null,
    },
  })

  // 4. Load (or initialize) adaptive session state
  let state = await getSessionState(attemptId)
  if (!state) {
    state = await initSession(attemptId)
  }

  // For Mastery Challenge attempts, adaptive state is null — just return
  if (!state) {
    return {
      isCorrect,
      nextAction: 'NEXT_QUESTION',
      newComplexity: 'LOW',
      remediationAssigned: false,
    }
  }

  // 5. Apply transition based on current phase
  let nextAction: NextAction = 'NEXT_QUESTION'
  let remediationAssigned = false

  if (state.pendingNearTransfer) {
    // We're in the near-transfer phase
    if (isCorrect) {
      const result = applyNearTransferCorrect(state)
      state = result.state
      nextAction = 'NEXT_QUESTION'
    } else {
      const result = applyNearTransferIncorrect(state)
      state = result.state
      nextAction = 'REMEDIATION_ESCALATED'

      // Escalate to remediation engine (Phase 4).
      // benchmarkId is guaranteed non-null here because adaptive sessions
      // are only created for PRACTICE assessments, which always target a benchmark.
      if (attempt.assessment.benchmarkId) {
        try {
          const remResult = await assignRemediation(
            studentId,
            attempt.assessment.benchmarkId,
            attemptId
          )
          remediationAssigned = remResult.count > 0
        } catch {
          // Non-fatal — remediation assignment failure doesn't break the session
        }
      }
    }
  } else {
    // Normal progression
    if (isCorrect) {
      state = applyCorrectAnswer(state)
      nextAction = 'NEXT_QUESTION'
    } else {
      state = applyIncorrectAnswer(state, questionId)
      nextAction = state.pendingWorkedExample ? 'WORKED_EXAMPLE' : 'NEXT_QUESTION'
    }
  }

  // 6. Persist updated state
  await saveSessionState(attemptId, state)

  return {
    isCorrect,
    nextAction,
    newComplexity: state.currentComplexity,
    remediationAssigned,
  }
}
