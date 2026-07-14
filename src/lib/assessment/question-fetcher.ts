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
 *
 * Phase 7 addition: when `studentId` is provided, stimulus content is
 * selected at the student's effective reading-load level (accommodation-aware).
 */

import { prisma } from '@/lib/db'
import { seededShuffle } from '@/lib/shuffle'
import {
  getEffectiveReadingLevel,
  getStudentAccommodations,
  fetchStimulusForQuestion,
  type StimulusAttachment,
  type GlossaryTerm,
} from '@/lib/reading-load'
import { resolveL1Language, getGlossaryTermsForBenchmark } from '@/lib/l1-glosses'

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
  /** Stimulus content at the student's effective reading-load level, or null if no stimulus */
  stimulus: StimulusAttachment | null
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
 * When `studentId` is provided:
 *   - Resolves the student's effective reading-load level (accommodation-aware)
 *   - Attaches stimulus content (with variant selection) to each question that has one
 *   - For MASTERY_CHALLENGE: accommodations do not downgrade the level
 *
 * NEVER includes isCorrect on options. Uses explicit Prisma select to prevent
 * accidental inclusion if schema fields change.
 */
export async function fetchAssessmentForStudent(
  assessmentId: string,
  studentId?: string
): Promise<{
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
              benchmarkId: true,
              options: {
                select: {
                  id: true,
                  optionText: true,
                  // isCorrect: DELIBERATELY OMITTED
                  // feedback:  DELIBERATELY OMITTED (returned post-submission for practice only)
                },
                orderBy: { id: 'asc' }, // stable shuffle input (authored order)
              },
            },
          },
        },
      },
    },
  })

  if (!assessment) return null

  const isMasteryChallenge = assessment.assessmentType === 'MASTERY_CHALLENGE'

  // Resolve effective reading level + L1 gloss language if studentId provided
  let effectiveLevel = 2 // default
  let glossaryByBenchmark = new Map<string | null, GlossaryTerm[]>()
  if (studentId) {
    const levelResult = await getEffectiveReadingLevel(
      studentId,
      2, // base level
      isMasteryChallenge
    )
    effectiveLevel = levelResult.effectiveLevel

    // L1 (first-language) gloss language: profile field or an ACC-L1-* grant.
    const [student, accommodations] = await Promise.all([
      prisma.student.findUnique({ where: { id: studentId }, select: { l1Language: true } }),
      getStudentAccommodations(studentId),
    ])
    const activeCodes = accommodations.filter((a) => a.active).map((a) => a.code)
    const languageCode = resolveL1Language(student?.l1Language ?? null, activeCodes)

    // Prefetch glossary terms once per distinct benchmark (with L1 glosses attached).
    const benchmarkIds = [...new Set(assessment.questions.map((aq) => aq.question.benchmarkId))]
    glossaryByBenchmark = new Map(
      await Promise.all(
        benchmarkIds.map(
          async (bid) =>
            [bid, await getGlossaryTermsForBenchmark(bid, languageCode)] as [string | null, GlossaryTerm[]]
        )
      )
    )
  }

  // Attach stimulus content to each question (parallel fetch)
  const questions = await Promise.all(
    assessment.questions.map(async (aq) => {
      let stimulus: StimulusAttachment | null = null
      if (studentId) {
        const glossaryTerms = glossaryByBenchmark.get(aq.question.benchmarkId) ?? []
        stimulus = await fetchStimulusForQuestion(aq.question.id, effectiveLevel, glossaryTerms)
      }
      return {
        id: aq.question.id,
        prompt: aq.question.prompt,
        itemType: aq.question.itemType,
        cognitiveComplexity: aq.question.cognitiveComplexity,
        readingLoadLevel: aq.question.readingLoadLevel,
        // Authored banks list the correct option first — shuffle at serve time
        // (seeded: stable across refreshes, different across students).
        // Grading matches by optionId, so order carries no meaning server-side.
        options: seededShuffle(
          aq.question.options,
          `${studentId ?? 'anon'}:${aq.question.id}`
        ),
        stimulus,
      }
    })
  )

  return {
    meta: {
      id: assessment.id,
      title: assessment.title,
      assessmentType: assessment.assessmentType,
      masteryThreshold: assessment.masteryThreshold,
    },
    questions,
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
