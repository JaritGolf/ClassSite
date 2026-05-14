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
            // isCorrect deliberately OMITTED — never sent to student before submission
          },
          orderBy: { id: 'asc' },
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

  return questions
}
