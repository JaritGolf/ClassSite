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
import { seededShuffle } from '@/lib/shuffle'
import {
  ACC_REDUCED_CHOICES_CODE,
  hasActiveAccommodation,
  isReducedChoicesEligibleType,
  reduceChoices,
} from '@/lib/reading-load'
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

  // ACC-REDUCED-CHOICES, resolved once per request rather than per item.
  // Gated on the attempt's assessment type as well as the grant, so this can
  // never reach a mastery-deciding form (see reading-load/reduced-choices).
  const reduceChoiceCount = await resolveReducedChoices(attemptId, studentId)

  if (!state) {
    // No adaptive state → this is a fixed-form assessment; return raw next question
    return getNextRegularQuestion(
      attemptId,
      null,
      null,
      effectiveReadingLevel,
      reduceChoiceCount
    )
  }

  // ── Pending worked example ─────────────────────────────────────────────
  if (state.pendingWorkedExample && state.workedExampleQuestionId) {
    const payload = await buildWorkedExamplePayload(
      attemptId,
      state,
      state.workedExampleQuestionId,
      reduceChoiceCount
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
      attemptId,
      effectiveReadingLevel,
      reduceChoiceCount
    )
    if (!nearTransfer) return { type: 'NO_ITEMS_AVAILABLE' }
    return { type: 'NEAR_TRANSFER', question: nearTransfer }
  }

  // ── Regular next question at currentComplexity ─────────────────────────
  return getNextRegularQuestion(
    attemptId,
    state.currentComplexity,
    null,
    effectiveReadingLevel,
    reduceChoiceCount
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function getNextRegularQuestion(
  attemptId: string,
  complexity: CognitiveComplexity | null,
  skillTag: string | null,
  effectiveReadingLevel?: number,
  reduceChoiceCount: boolean = false
): Promise<NextItemPayload> {
  const benchmarkId = await getBenchmarkId(attemptId)
  const seenIds = await getSeenQuestionIds(attemptId)

  const question = await selectQuestion(
    benchmarkId,
    complexity,
    seenIds,
    skillTag,
    attemptId,
    effectiveReadingLevel,
    reduceChoiceCount
  )
  if (!question) return { type: 'NO_ITEMS_AVAILABLE' }
  return { type: 'QUESTION', question }
}

async function buildWorkedExamplePayload(
  attemptId: string,
  state: AdaptiveState,
  workedExampleQuestionId: string,
  reduceChoiceCount: boolean = false
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
        orderBy: { id: 'asc' }, // stable shuffle input (authored order)
      },
    },
  })

  if (!question) return { type: 'NO_ITEMS_AVAILABLE' }

  const correctOpt = question.options.find((o) => o.isCorrect)

  // ACC-REDUCED-CHOICES applies here too. `correctOpt` is always retained by
  // reduceChoices, so the `correctOptionId` returned below still names an
  // option the student can actually see.
  const visibleOptions = reduceChoiceCount
    ? reduceChoices(
        question.options,
        new Set(correctOpt ? [correctOpt.id] : []),
        `${attemptId}:${question.id}`
      )
    : question.options

  // Safe question (no isCorrect on options for the payload)
  const safeQuestion: SafeQuestion = {
    id: question.id,
    prompt: question.prompt,
    cognitiveComplexity: question.cognitiveComplexity,
    skillTag: question.skillTag,
    options: seededShuffle(
      visibleOptions.map((o) => ({ id: o.id, optionText: o.optionText })),
      `${attemptId}:${question.id}`
    ),
  }

  // Pre-fetch a near-transfer question (same complexity, different ID)
  const seenIds = await getSeenQuestionIds(attemptId)
  const benchmarkId = await getBenchmarkId(attemptId)
  const nearTransfer = await selectQuestion(
    benchmarkId,
    state.currentComplexity, // near-transfer is at the (already-bumped-down) complexity
    [...seenIds, workedExampleQuestionId],
    null,
    attemptId,
    undefined,
    reduceChoiceCount
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
  shuffleSeedPrefix: string,
  effectiveReadingLevel?: number,
  reduceChoiceCount: boolean = false
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
        // `isCorrect` is selected ONLY to decide which distractors may be
        // dropped for ACC-REDUCED-CHOICES, and is stripped in the explicit
        // mapping below — the returned SafeQuestion never carries it. Same
        // pattern buildWorkedExamplePayload already uses.
        select: { id: true, optionText: true, isCorrect: true },
        orderBy: { id: 'asc' }, // stable shuffle input (authored order)
      },
    },
  })

  if (!question) return null

  const visibleOptions = reduceChoiceCount
    ? reduceChoices(
        question.options,
        new Set(question.options.filter((o) => o.isCorrect).map((o) => o.id)),
        `${shuffleSeedPrefix}:${question.id}`
      )
    : question.options

  // Authored banks list the correct option first — shuffle at serve time.
  // Built field-by-field rather than spread + cast, so `isCorrect` cannot ride
  // along into the payload if this select changes later.
  return {
    id: question.id,
    prompt: question.prompt,
    cognitiveComplexity: question.cognitiveComplexity,
    skillTag: question.skillTag,
    options: seededShuffle(
      visibleOptions.map((o) => ({ id: o.id, optionText: o.optionText })),
      `${shuffleSeedPrefix}:${question.id}`
    ),
  }
}

/**
 * Whether this practice session should serve reduced answer choices: the
 * student must hold ACC-REDUCED-CHOICES *and* the attempt's assessment must be
 * an eligible (non-mastery-deciding) type.
 *
 * The type check matters even though the Practice Arena is normally driven by a
 * PRACTICE assessment — `getNextItem` also serves attempts with no adaptive
 * state, so it must not assume the caller's context.
 */
async function resolveReducedChoices(
  attemptId: string,
  studentId: string
): Promise<boolean> {
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId, voided: false },
    select: { assessment: { select: { assessmentType: true } } },
  })
  if (!attempt || !isReducedChoicesEligibleType(attempt.assessment.assessmentType)) {
    return false
  }
  return hasActiveAccommodation(studentId, ACC_REDUCED_CHOICES_CODE)
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
