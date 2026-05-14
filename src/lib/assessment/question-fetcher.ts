/**
 * Question Fetcher — Safe DB Access
 *
 * SECURITY GUARANTEE: fetchSafeQuestions NEVER includes `isCorrect` or
 * `feedback` in the returned data. Only `id` and `optionText` are returned
 * for options, satisfying Audit 3 item 2.
 *
 * Correct options and feedback are fetched by separate functions that are
 * ONLY called server-side after submission — never included in the
 * pre-submission question delivery response.
 */

import { prisma } from '@/lib/db'

/** Safe question shape — no isCorrect, no feedback on options */
export interface SafeOption {
  id: string
  optionText: string
}

export interface SafeQuestion {
  id: string
  prompt: string
  itemType: string
  cognitiveComplexity: string
  readingLoadLevel: number
  options: SafeOption[]
}

export interface AssessmentMeta {
  id: string
  title: string
  assessmentType: string
  masteryThreshold: number
}

/**
 * Fetch an assessment's metadata + questions for safe delivery to a student.
 * Returns null if the assessment does not exist.
 *
 * NEVER includes isCorrect on options. Uses explicit Prisma select to prevent
 * accidental inclusion if schema fields change.
 */
export async function fetchAssessmentForStudent(assessmentId: string): Promise<{
  meta: AssessmentMeta
  questions: SafeQuestion[]
} | null> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      id: true,
      title: true,
      assessmentType: true,
      masteryThreshold: true,
      questions: {
        orderBy: { sequenceOrder: 'asc' },
        select: {
          question: {
            select: {
              id: true,
              prompt: true,
              itemType: true,
              cognitiveComplexity: true,
              readingLoadLevel: true,
              options: {
                select: {
                  id: true,
                  optionText: true,
                  // isCorrect: DELIBERATELY OMITTED
                  // feedback:  DELIBERATELY OMITTED (returned post-submission for practice only)
                },
                orderBy: { id: 'asc' }, // stable ordering
              },
            },
          },
        },
      },
    },
  })

  if (!assessment) return null

  return {
    meta: {
      id: assessment.id,
      title: assessment.title,
      assessmentType: assessment.assessmentType,
      masteryThreshold: assessment.masteryThreshold,
    },
    questions: assessment.questions.map((aq) => ({
      id: aq.question.id,
      prompt: aq.question.prompt,
      itemType: aq.question.itemType,
      cognitiveComplexity: aq.question.cognitiveComplexity,
      readingLoadLevel: aq.question.readingLoadLevel,
      options: aq.question.options,
    })),
  }
}

/**
 * Fetch the correct option ID for each question in an assessment.
 * Used SERVER-SIDE ONLY during grading — result is never sent to the client.
 *
 * Returns Map<questionId → correct optionId>
 */
export async function fetchCorrectOptions(
  questionIds: string[]
): Promise<Map<string, string>> {
  if (questionIds.length === 0) return new Map()

  const correctOptions = await prisma.questionOption.findMany({
    where: {
      questionId: { in: questionIds },
      isCorrect: true,
    },
    select: {
      questionId: true,
      id: true,
    },
  })

  return new Map(correctOptions.map((opt) => [opt.questionId, opt.id]))
}

/**
 * Fetch points per question from AssessmentQuestion.
 * Returns Map<questionId → points>
 */
export async function fetchQuestionPoints(
  assessmentId: string
): Promise<Map<string, number>> {
  const aqRecords = await prisma.assessmentQuestion.findMany({
    where: { assessmentId },
    select: { questionId: true, points: true },
  })
  return new Map(aqRecords.map((aq) => [aq.questionId, aq.points]))
}

/**
 * Fetch feedback text for a set of option IDs.
 * Used post-submission in practice mode only — NEVER pre-submission.
 *
 * Returns Map<optionId → feedback text | null>
 */
export async function fetchOptionFeedback(
  optionIds: string[]
): Promise<Map<string, string | null>> {
  if (optionIds.length === 0) return new Map()

  const options = await prisma.questionOption.findMany({
    where: { id: { in: optionIds } },
    select: { id: true, feedback: true },
  })

  return new Map(options.map((opt) => [opt.id, opt.feedback ?? null]))
}
