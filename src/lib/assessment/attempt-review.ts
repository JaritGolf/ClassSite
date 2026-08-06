/**
 * Attempt Review — Safe Post-Hoc Review of a Student's Own Past Attempts
 *
 * Lets a student revisit a mastered mission and see, for every past submitted
 * attempt on a given assessment (across all forms of that assessment type —
 * e.g. Mastery Challenge Form A + Form B), each question they were asked and
 * whether they answered it correctly.
 *
 * SECURITY GUARANTEE: mirrors fetchAssessmentForStudent's answer-omitting
 * `select` (question-fetcher.ts). Never joins QuestionOption.isCorrect or
 * .feedback, and never resolves the correct option. `AttemptResponse.isCorrect`
 * is safe to expose — it is the server-computed record of the student's OWN
 * already-graded response, not the answer key.
 */

import { prisma } from '@/lib/db'

export interface AttemptReviewResponse {
  questionId: string
  prompt: string
  /** The option text the student selected. Null if unanswered. */
  selectedOptionText: string | null
  isCorrect: boolean
  confidence: number | null
}

export interface AttemptReview {
  /**
   * Chronological position across ALL forms of this assessment type (1, 2,
   * 3, ...) — NOT the raw AssessmentAttempt.attemptNumber, which resets to 1
   * on every rotating form (Form A attempt 1, Form B attempt 1, ...) and
   * would show "Attempt 1" twice for a Form A fail + Form B pass.
   */
  attemptNumber: number
  submittedAt: string
  score: number | null
  passed: boolean | null
  responses: AttemptReviewResponse[]
}

/**
 * Fetches every submitted, non-voided attempt a student has made against a
 * benchmark's assessments of one type — scoped by (benchmarkId, assessmentType)
 * rather than a single assessmentId so that all rotating forms (Form A, Form B,
 * ...) surface together, matching how off-ramp counting already aggregates
 * attempts across forms. Ordered by submission time, since the raw per-form
 * attemptNumber resets across forms and cannot order chronologically.
 */
export async function getAttemptReviewsForStudent({
  studentId,
  benchmarkId,
  assessmentType,
}: {
  studentId: string
  benchmarkId: string
  assessmentType: 'PRE_CHECK' | 'VOCAB_CHECK' | 'READINESS_CHECK' | 'MASTERY_CHALLENGE'
}): Promise<AttemptReview[]> {
  const attempts = await prisma.assessmentAttempt.findMany({
    where: {
      studentId,
      voided: false,
      submittedAt: { not: null },
      assessment: { benchmarkId, assessmentType },
    },
    orderBy: { submittedAt: 'asc' },
    select: {
      submittedAt: true,
      score: true,
      passed: true,
      responses: {
        orderBy: { id: 'asc' },
        select: {
          questionId: true,
          isCorrect: true,
          confidence: true,
          // Legacy rows (pre-dating a data-hygiene fix in gradeAndSubmit) can
          // have a null selectedOptionId column while the value still lives
          // in responseJson — fall back to it below rather than showing a
          // false "no answer" for an attempt the student actually completed.
          selectedOptionId: true,
          responseJson: true,
          question: { select: { prompt: true } },
          selectedOption: { select: { optionText: true } },
          // Any join to the correct QuestionOption or its feedback text is
          // DELIBERATELY OMITTED.
        },
      },
    },
  })

  // Batch-resolve option text for legacy responses whose selectedOptionId
  // column is null, using the option id preserved in responseJson.
  const legacyOptionIds = new Set<string>()
  for (const attempt of attempts) {
    for (const r of attempt.responses) {
      if (!r.selectedOptionId && !r.selectedOption) {
        const fallbackId = extractLegacySelectedOptionId(r.responseJson)
        if (fallbackId) legacyOptionIds.add(fallbackId)
      }
    }
  }
  const legacyOptionText =
    legacyOptionIds.size > 0
      ? new Map(
          (
            await prisma.questionOption.findMany({
              where: { id: { in: [...legacyOptionIds] } },
              select: { id: true, optionText: true },
              // isCorrect/feedback DELIBERATELY OMITTED
            })
          ).map((o) => [o.id, o.optionText])
        )
      : new Map<string, string>()

  return attempts.map((attempt, index) => ({
    attemptNumber: index + 1,
    submittedAt: (attempt.submittedAt as Date).toISOString(),
    score: attempt.score,
    passed: attempt.passed,
    responses: attempt.responses.map((r) => {
      let selectedOptionText = r.selectedOption?.optionText ?? null
      if (!selectedOptionText) {
        const fallbackId = extractLegacySelectedOptionId(r.responseJson)
        if (fallbackId) selectedOptionText = legacyOptionText.get(fallbackId) ?? null
      }
      return {
        questionId: r.questionId,
        prompt: r.question.prompt,
        selectedOptionText,
        isCorrect: r.isCorrect,
        confidence: r.confidence,
      }
    }),
  }))
}

/** Reads the legacy fallback shape `{ selectedOptionId: string }` defensively. */
function extractLegacySelectedOptionId(responseJson: unknown): string | null {
  if (
    responseJson &&
    typeof responseJson === 'object' &&
    'selectedOptionId' in responseJson &&
    typeof (responseJson as { selectedOptionId: unknown }).selectedOptionId === 'string'
  ) {
    return (responseJson as { selectedOptionId: string }).selectedOptionId
  }
  return null
}
