/**
 * Next Item Selection
 *
 * Returns what the student should see next in a practice session:
 *   - A worked example (when pendingWorkedExample = true)
 *   - A near-transfer question (when pendingNearTransfer = true)
 *   - The next regular question at currentComplexity
 *
 * Security: options are returned WITHOUT isCorrect (safe delivery model
 * matching Phase 3 fetchAssessmentForStudent).
 *
 * Phase 7 addition: optional `effectiveReadingLevel` parameter filters
 * questions to the student's accommodation-adjusted level for practice.
 */

import { prisma } from '@/lib/db'
import type { CognitiveComplexity } from '@prisma/client'
import type { AdaptiveState } from './transitions'
import { acknowledgeWorkedExample } from './transitions'
import { getSessionState, saveSessionState } from './session'

// ── Result types ───────────────────────────────────────────────────────────

export interface SafeOption {
  id: string
  optionText: string
}

export interface SafeQuestion {
  id: string
  prompt: string
  cognitiveComplexity: CognitiveComplexity
  skillTag: string
  options: SafeOption[]
}

export interface WorkedExamplePayload {
  type: 'WORKED_EXAMPLE'
  question: SafeQuestion
  /** The correct option's feedback text — the "expert reasoning" */
  expertReasoning: string | null
  /** The correct option ID (revealed after worked example — student has already failed) */
  correctOptionId: string
  nearTransferQuestion: SafeQuestion | null
}

export type NextItemPayload =
  | { type: 'QUESTION'; question: SafeQuestion }
  | WorkedExamplePayload
  | { type: 'NEAR_TRANSFER'; question: SafeQuestion }
  | { type: 'NO_ITEMS_AVAILABLE' }

// ── Main function ──────────────────────────────────────────────────────────

/**
 * Return the next item for the student in a practice session.
 *
 * @param attemptId            - The current AssessmentAttempt.id
 * @param studentId            - Used to determine seen question IDs for exclusion
 * @param effectiveReadingLevel - Optional: filter questions to this level (accommodation override)
 */
export async function getNextItem(
  attemptId: string,
  studentId: string,
  effectiveReadingLevel?: number
): Promise<NextItemPayload> {
  const state = await getSessionState(attemptId)

  if (!state) {
    // No adaptive state → this is a fixed-form assessment; return raw next question
    return getNextRegularQuestion(attemptId, null, null, effectiveReadingLevel)
  }

  // ── Pending worked example ─────────────────────────────────────────────
  if (state.pendingWorkedExample && state.workedExampleQuestionId) {
    const payload = await buildWorkedExamplePayload(
      attemptId,
      state,
      state.workedExampleQuestionId
    )

    // Transition to pendingNearTransfer now that we're delivering the example
    const nextState = acknowledgeWorkedExample(state)
    await saveSessionState(attemptId, nextState)

    return payload
  }

  // ── Pending near-transfer item ─────────────────────────────────────────
  if (state.pendingNearTransfer) {
    // For near-transfer, exclude only the worked-example question itself —
    // not all seen IDs. The point is to test the student on this complexity
    // again, and excluding the pool based on history would leave nothing in
    // small question banks.
    const excludeIds = state.workedExampleQuestionId
      ? [state.workedExampleQuestionId]
      : []

    const nearTransfer = await selectQuestion(
      await getBenchmarkId(attemptId),
      state.currentComplexity,
      excludeIds,
      null, // no skill-tag filter — any same-complexity question works
      effectiveReadingLevel
    )
    if (!nearTransfer) return { type: 'NO_ITEMS_AVAILABLE' }
    return { type: 'NEAR_TRANSFER', question: nearTransfer }
  }

  // ── Regular next question at currentComplexity ─────────────────────────
  return getNextRegularQuestion(attemptId, state.currentComplexity, null, effectiveReadingLevel)
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function getNextRegularQuestion(
  attemptId: string,
  complexity: CognitiveComplexity | null,
  skillTag: string | null,
  effectiveReadingLevel?: number
): Promise<NextItemPayload> {
  const benchmarkId = await getBenchmarkId(attemptId)
  const seenIds = await getSeenQuestionIds(attemptId)

  const question = await selectQuestion(benchmarkId, complexity, seenIds, skillTag, effectiveReadingLevel)
  if (!question) return { type: 'NO_ITEMS_AVAILABLE' }
  return { type: 'QUESTION', question }
}

async function buildWorkedExamplePayload(
  attemptId: string,
  state: AdaptiveState,
  workedExampleQuestionId: string
): Promise<NextItemPayload> {
  // Load the question that triggered the worked example (including correct option)
  const question = await prisma.question.findUnique({
    where: { id: workedExampleQuestionId },
    select: {
      id: true,
      prompt: true,
      cognitiveComplexity: true,
      skillTag: true,
      options: {
        select: { id: true, optionText: true, isCorrect: true, feedback: true },
      },
    },
  })

  if (!question) return { type: 'NO_ITEMS_AVAILABLE' }

  const correctOpt = question.options.find((o) => o.isCorrect)

  // Safe question (no isCorrect on options for the payload)
  const safeQuestion: SafeQuestion = {
    id: question.id,
    prompt: question.prompt,
    cognitiveComplexity: question.cognitiveComplexity,
    skillTag: question.skillTag,
    options: question.options.map((o) => ({ id: o.id, optionText: o.optionText })),
  }

  // Pre-fetch a near-transfer question (same complexity, different ID)
  const seenIds = await getSeenQuestionIds(attemptId)
  const benchmarkId = await getBenchmarkId(attemptId)
  const nearTransfer = await selectQuestion(
    benchmarkId,
    state.currentComplexity, // near-transfer is at the (already-bumped-down) complexity
    [...seenIds, workedExampleQuestionId],
    null
  )

  return {
    type: 'WORKED_EXAMPLE',
    question: safeQuestion,
    expertReasoning: correctOpt?.feedback ?? null,
    correctOptionId: correctOpt?.id ?? '',
    nearTransferQuestion: nearTransfer,
  }
}

/**
 * Pick one approved question at the given complexity, excluding seen IDs.
 * When effectiveReadingLevel is provided, filters to questions at that level
 * or below (accommodation-aware practice mode, Audit 7 item 4).
 */
async function selectQuestion(
  benchmarkId: string,
  complexity: CognitiveComplexity | null,
  seenIds: string[],
  skillTag: string | null,
  effectiveReadingLevel?: number
): Promise<SafeQuestion | null> {
  const question = await prisma.question.findFirst({
    where: {
      benchmarkId,
      approvalStatus: 'APPROVED',
      active: true,
      ...(complexity ? { cognitiveComplexity: complexity } : {}),
      ...(skillTag ? { skillTag } : {}),
      ...(effectiveReadingLevel !== undefined
        ? { readingLoadLevel: { lte: effectiveReadingLevel } }
        : {}),
      id: seenIds.length > 0 ? { notIn: seenIds } : undefined,
    },
    select: {
      id: true,
      prompt: true,
      cognitiveComplexity: true,
      skillTag: true,
      options: {
        select: { id: true, optionText: true },
        // isCorrect deliberately omitted
        orderBy: { id: 'asc' },
      },
    },
  })

  return question as SafeQuestion | null
}

async function getBenchmarkId(attemptId: string): Promise<string> {
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId, voided: false },
    select: { assessment: { select: { benchmarkId: true } } },
  })
  return attempt?.assessment.benchmarkId ?? ''
}

async function getSeenQuestionIds(attemptId: string): Promise<string[]> {
  const responses = await prisma.attemptResponse.findMany({
    where: { attemptId },
    select: { questionId: true },
  })
  return responses.map((r) => r.questionId)
}
