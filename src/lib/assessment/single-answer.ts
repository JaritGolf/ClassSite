/**
 * Grade ONE answer to ONE question — read-only, anonymous.
 *
 * Used by the practice-style surfaces (Practice Arena, Daily Drill), where the
 * student gets the right answer and an explanation straight after answering.
 *
 * Because it reveals the key after a single answer, it must never be usable as
 * an oracle for a secure assessment. So it refuses any question that sits on a
 * Mastery Challenge form: those are graded only as a whole form, by
 * gradeSubmission, which reveals nothing.
 */

import { prisma } from '@/lib/db'
import { suggestRemediation, type RemediationSuggestion } from '@/lib/remediation/suggest'

export class SingleAnswerError extends Error {
  constructor(
    message: string,
    public readonly code: 'NOT_FOUND' | 'NOT_PRACTICE'
  ) {
    super(message)
    this.name = 'SingleAnswerError'
  }
}

export interface SingleAnswerOutcome {
  isCorrect: boolean
  correctOptionText: string | null
  selectedFeedback: string | null
  benchmarkCode: string
  /** Only when the caller asked for it and the answer was wrong. */
  remediation: RemediationSuggestion[]
}

/** Question ids that appear on any Mastery Challenge form. */
export async function masteryFormQuestionIds(benchmarkId?: string): Promise<Set<string>> {
  const rows = await prisma.assessmentQuestion.findMany({
    where: {
      assessment: {
        assessmentType: 'MASTERY_CHALLENGE',
        ...(benchmarkId ? { benchmarkId } : {}),
      },
    },
    select: { questionId: true },
  })
  return new Set(rows.map((r) => r.questionId))
}

export async function gradeSingleAnswer(
  questionId: string,
  selectedOptionId: string,
  opts: { withRemediation?: boolean } = {}
): Promise<SingleAnswerOutcome> {
  const question = await prisma.question.findFirst({
    where: { id: questionId, approvalStatus: 'APPROVED', active: true },
    select: {
      id: true,
      benchmarkId: true,
      skillTag: true,
      misconceptionId: true,
      benchmark: { select: { code: true } },
      options: { select: { id: true, optionText: true, isCorrect: true, feedback: true } },
      assessmentItems: {
        where: { assessment: { assessmentType: 'MASTERY_CHALLENGE' } },
        select: { id: true },
        take: 1,
      },
    },
  })
  if (!question) throw new SingleAnswerError('Question not found', 'NOT_FOUND')
  if (question.assessmentItems.length > 0) {
    throw new SingleAnswerError('This question is not available for practice', 'NOT_PRACTICE')
  }

  const selected = question.options.find((o) => o.id === selectedOptionId)
  if (!selected) throw new SingleAnswerError('Option not found for this question', 'NOT_FOUND')

  const correct = question.options.find((o) => o.isCorrect)
  const isCorrect = selected.isCorrect

  const remediation =
    opts.withRemediation && !isCorrect
      ? await suggestRemediation(question.benchmarkId, [
          { confidence: null, skillTag: question.skillTag, misconceptionId: question.misconceptionId },
        ])
      : []

  return {
    isCorrect,
    correctOptionText: correct?.optionText ?? null,
    selectedFeedback: selected.feedback ?? null,
    benchmarkCode: question.benchmark.code,
    remediation,
  }
}
