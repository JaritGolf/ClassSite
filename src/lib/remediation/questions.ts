/**
 * Alternate Question Fetcher for Reassessment
 *
 * Returns approved, active questions for a benchmark that the student has NOT
 * already answered in any prior assessment attempt for that benchmark.
 *
 * Security: options are returned WITHOUT isCorrect — same safe-delivery model
 * as fetchAssessmentForStudent() in Phase 3.
 *
 * Spec reference: Section 36.5 Audit 4 item 8
 */

import { prisma } from '@/lib/db'
import { seededShuffle } from '@/lib/shuffle'
import {
  ACC_REDUCED_CHOICES_CODE,
  hasActiveAccommodation,
  reduceChoices,
} from '@/lib/reading-load'

// ── Result Types ──────────────────────────────────────────────────────────────

export interface AlternateQuestion {
  id: string
  prompt: string
  itemType: string
  cognitiveComplexity: string
  readingLoadLevel: number
  skillTag: string
  options: Array<{ id: string; optionText: string }>
}

// ── Main Function ─────────────────────────────────────────────────────────────

/**
 * Fetch alternate questions for a reassessment, excluding any question the
 * student has already encountered in a prior attempt on any assessment for
 * this benchmark.
 *
 * If the student has seen every available question (edge case with small pools),
 * returns the full approved question pool as a graceful fallback.
 *
 * @param assessmentId - The Assessment.id (to resolve benchmarkId)
 * @param studentId    - The Student.id
 * @returns Array of safe questions (no isCorrect on options)
 */
export async function fetchAlternateQuestions(
  assessmentId: string,
  studentId: string
): Promise<AlternateQuestion[]> {
  // 1. Resolve the benchmark from the assessment
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { benchmarkId: true },
  })

  if (!assessment) return []

  const { benchmarkId } = assessment
  // Alternate-question fetch is only meaningful for per-benchmark assessments.
  // Republic Challenge / Final Trial have null benchmarkId — no alternates.
  if (benchmarkId === null) return []

  // 2. Collect all question IDs the student has already answered for this benchmark
  const seenResponses = await prisma.attemptResponse.findMany({
    where: {
      attempt: {
        studentId,
        assessment: { benchmarkId },
      },
    },
    select: { questionId: true },
  })

  const seenIds = [...new Set(seenResponses.map((r) => r.questionId))]

  // 3. Fetch approved, active questions NOT in the seen set
  const buildQuery = (excludeIds: string[]) =>
    prisma.question.findMany({
      where: {
        benchmarkId,
        approvalStatus: 'APPROVED',
        active: true,
        ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
      },
      select: {
        id: true,
        prompt: true,
        itemType: true,
        cognitiveComplexity: true,
        readingLoadLevel: true,
        skillTag: true,
        options: {
          select: {
            id: true,
            optionText: true,
            // `isCorrect` is read ONLY to decide which distractors may be
            // dropped for ACC-REDUCED-CHOICES, and is stripped in the explicit
            // mapping below. AlternateQuestion has no such field, so it can
            // never be sent to a student before submission.
            isCorrect: true,
          },
          orderBy: { id: 'asc' }, // stable shuffle input (authored order)
        },
      },
    })

  let questions = await buildQuery(seenIds)

  // 4. Graceful fallback: if the student has seen all questions, return the full pool
  if (questions.length === 0 && seenIds.length > 0) {
    console.warn(
      `[fetchAlternateQuestions] Student ${studentId} has seen all questions for benchmark ${benchmarkId}. Returning full pool.`
    )
    questions = await buildQuery([])
  }

  // ACC-REDUCED-CHOICES. Remediation is reteaching, never a mastery decision,
  // so it is an eligible surface — the reassessment that follows is not.
  const reduceChoiceCount = await hasActiveAccommodation(
    studentId,
    ACC_REDUCED_CHOICES_CODE
  )

  // Authored banks list the correct option first — shuffle at serve time.
  // Mapped field-by-field rather than spread, so `isCorrect` cannot ride along.
  return questions.map((q) => {
    const visibleOptions = reduceChoiceCount
      ? reduceChoices(
          q.options,
          new Set(q.options.filter((o) => o.isCorrect).map((o) => o.id)),
          `${studentId}:${q.id}`
        )
      : q.options

    return {
      id: q.id,
      prompt: q.prompt,
      itemType: q.itemType,
      cognitiveComplexity: q.cognitiveComplexity,
      readingLoadLevel: q.readingLoadLevel,
      skillTag: q.skillTag,
      options: seededShuffle(
        visibleOptions.map((o) => ({ id: o.id, optionText: o.optionText })),
        `${studentId}:${q.id}`
      ),
    }
  })
}
