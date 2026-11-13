/**
 * Practice Arena item selection — read-only, anonymous.
 *
 * The adaptive session state (current complexity, streaks, whether a worked
 * example is pending) is held by the student's browser. Each request sends
 * that state plus the ids of questions already seen this session, and gets the
 * next item back. The server keeps nothing between requests.
 *
 * Questions on a Mastery Challenge form are never served here: practice
 * reveals answers, and those answers must not be learnable in advance.
 */

import { z } from 'zod'
import { prisma } from '@/lib/db'
import type { CognitiveComplexity } from '@prisma/client'
import { acknowledgeWorkedExample, type AdaptiveState } from './transitions'
import { masteryFormQuestionIds } from '@/lib/assessment/single-answer'

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

export type NextItemPayload =
  | { type: 'QUESTION'; question: SafeQuestion }
  | {
      type: 'WORKED_EXAMPLE'
      question: SafeQuestion
      expertReasoning: string | null
      correctOptionId: string
      nearTransferQuestion: SafeQuestion | null
    }
  | { type: 'NEAR_TRANSFER'; question: SafeQuestion }
  | { type: 'NO_ITEMS_AVAILABLE' }

const Complexity = z.enum(['LOW', 'MODERATE', 'HIGH'])

export const AdaptiveStateSchema = z.object({
  currentComplexity: Complexity,
  consecutiveCorrect: z.number().int().min(0).max(50),
  consecutiveIncorrect: z.number().int().min(0).max(50),
  pendingWorkedExample: z.boolean(),
  pendingNearTransfer: z.boolean(),
  workedExampleQuestionId: z.string().max(60).nullable(),
})

export const PracticeNextItemSchema = z.object({
  assessmentId: z.string().min(1).max(60),
  state: AdaptiveStateSchema,
  seenQuestionIds: z.array(z.string().max(60)).max(300),
})

function shuffled<T>(items: readonly T[]): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Pick a random approved question. Options are selected WITHOUT the answer key. */
async function selectQuestion(
  benchmarkId: string,
  complexity: CognitiveComplexity | null,
  excludeIds: string[]
): Promise<SafeQuestion | null> {
  const candidates = await prisma.question.findMany({
    where: {
      benchmarkId,
      approvalStatus: 'APPROVED',
      active: true,
      ...(complexity ? { cognitiveComplexity: complexity } : {}),
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
    },
    select: { id: true },
  })
  if (candidates.length === 0) return null
  const pick = candidates[Math.floor(Math.random() * candidates.length)]

  const question = await prisma.question.findUnique({
    where: { id: pick.id },
    select: {
      id: true,
      prompt: true,
      cognitiveComplexity: true,
      skillTag: true,
      options: { select: { id: true, optionText: true }, orderBy: { id: 'asc' } },
    },
  })
  if (!question) return null
  return { ...question, options: shuffled(question.options) }
}

export async function getPracticeItem(input: z.infer<typeof PracticeNextItemSchema>): Promise<{
  payload: NextItemPayload
  state: AdaptiveState
} | null> {
  const assessment = await prisma.assessment.findFirst({
    where: { id: input.assessmentId, assessmentType: 'PRACTICE', approvalStatus: 'APPROVED' },
    select: { benchmarkId: true },
  })
  if (!assessment?.benchmarkId) return null
  const benchmarkId = assessment.benchmarkId

  const state: AdaptiveState = input.state
  const masteryIds = [...(await masteryFormQuestionIds(benchmarkId))]
  const exclude = [...new Set([...input.seenQuestionIds, ...masteryIds])]

  // Any complexity is better than nothing when a level's pool runs dry.
  const pick = async (complexity: CognitiveComplexity, extraExclude: string[] = []) =>
    (await selectQuestion(benchmarkId, complexity, [...exclude, ...extraExclude])) ??
    (await selectQuestion(benchmarkId, null, [...exclude, ...extraExclude]))

  // A struggle streak: teach the question that was just missed, then ask a similar one.
  if (state.pendingWorkedExample && state.workedExampleQuestionId) {
    const question = await prisma.question.findFirst({
      where: { id: state.workedExampleQuestionId, benchmarkId, approvalStatus: 'APPROVED' },
      select: {
        id: true,
        prompt: true,
        cognitiveComplexity: true,
        skillTag: true,
        // The key IS loaded here, on purpose: a worked example shows the
        // answer to a question the student has already answered.
        options: {
          select: { id: true, optionText: true, isCorrect: true, feedback: true },
          orderBy: { id: 'asc' },
        },
      },
    })
    const nextState = acknowledgeWorkedExample(state)
    if (!question || masteryIds.includes(question.id)) {
      return { payload: { type: 'NO_ITEMS_AVAILABLE' }, state: nextState }
    }
    const correct = question.options.find((o) => o.isCorrect)
    return {
      payload: {
        type: 'WORKED_EXAMPLE',
        question: {
          id: question.id,
          prompt: question.prompt,
          cognitiveComplexity: question.cognitiveComplexity,
          skillTag: question.skillTag,
          options: shuffled(question.options.map((o) => ({ id: o.id, optionText: o.optionText }))),
        },
        expertReasoning: correct?.feedback ?? null,
        correctOptionId: correct?.id ?? '',
        nearTransferQuestion: await pick(state.currentComplexity, [question.id]),
      },
      state: nextState,
    }
  }

  if (state.pendingNearTransfer) {
    const question = await pick(
      state.currentComplexity,
      state.workedExampleQuestionId ? [state.workedExampleQuestionId] : []
    )
    return {
      payload: question ? { type: 'NEAR_TRANSFER', question } : { type: 'NO_ITEMS_AVAILABLE' },
      state,
    }
  }

  const question = await pick(state.currentComplexity)
  return {
    payload: question ? { type: 'QUESTION', question } : { type: 'NO_ITEMS_AVAILABLE' },
    state,
  }
}
