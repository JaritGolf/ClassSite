/**
 * Assessment Attempt Lifecycle
 *
 * Orchestrates the full attempt flow: start → grade → record.
 * All grading decisions are server-side. Client data is only used for
 * selectedOptionId, confidence, and timeSeconds — never for isCorrect
 * or pointsAwarded.
 */

import { prisma } from '@/lib/db'
import {
  fetchCorrectOptions,
  fetchQuestionPoints,
  fetchOptionFeedback,
} from './question-fetcher'
import { gradeResponses, computeScore } from './grader'
import type { SubmitInput } from './index'

// ── Error Types ───────────────────────────────────────────────────────────────

export class AssessmentError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'NOT_FOUND'
      | 'FORBIDDEN'
      | 'ALREADY_SUBMITTED'
      | 'CONFIDENCE_REQUIRED'
      | 'INVALID_CONTENT'
  ) {
    super(message)
    this.name = 'AssessmentError'
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StartAttemptResult {
  attemptId: string
  attemptNumber: number
  assessmentType: string
  masteryThreshold: number
}

export interface FeedbackItem {
  questionId: string
  selectedOptionId: string
  isCorrect: boolean
  feedback: string | null
}

export interface SubmitResult {
  attemptId: string
  attemptNumber: number
  score: number
  passed: boolean
  /** Only populated for PRACTICE assessments — null for secure modes */
  feedback: FeedbackItem[] | null
}

// ── Secure assessment types — feedback is never returned ──────────────────────

const SECURE_ASSESSMENT_TYPES = new Set([
  'MASTERY_CHALLENGE',
  'REASSESSMENT',
  'REPUBLIC_CHALLENGE',
  'FINAL_TRIAL',
  'READINESS_CHECK',
  'DIAGNOSTIC',
])

const PRACTICE_ASSESSMENT_TYPES = new Set([
  'PRACTICE',
])

// ── Confidence is required on these assessment types ──────────────────────────

const CONFIDENCE_REQUIRED_TYPES = new Set([
  'MASTERY_CHALLENGE',
  'REPUBLIC_CHALLENGE',
  'FINAL_TRIAL',
])

// ── Start Attempt ─────────────────────────────────────────────────────────────

/**
 * Begin a new assessment attempt for a student.
 * Creates an AssessmentAttempt record and returns the attemptId.
 *
 * @param assessmentId - The assessment to attempt
 * @param studentId    - The Student.id (not User.id) of the attempting student
 * @throws AssessmentError NOT_FOUND if assessment does not exist
 */
export async function startAttempt(
  assessmentId: string,
  studentId: string
): Promise<StartAttemptResult> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { id: true, assessmentType: true, masteryThreshold: true },
  })

  if (!assessment) {
    throw new AssessmentError(
      `Assessment ${assessmentId} not found`,
      'NOT_FOUND'
    )
  }

  // Determine next attempt number
  const existingCount = await prisma.assessmentAttempt.count({
    where: { assessmentId, studentId },
  })
  const attemptNumber = existingCount + 1

  const attempt = await prisma.assessmentAttempt.create({
    data: {
      assessmentId,
      studentId,
      attemptNumber,
    },
    select: { id: true, attemptNumber: true },
  })

  return {
    attemptId: attempt.id,
    attemptNumber: attempt.attemptNumber,
    assessmentType: assessment.assessmentType,
    masteryThreshold: assessment.masteryThreshold,
  }
}

// ── Grade and Submit ──────────────────────────────────────────────────────────

/**
 * Grade a student's submission and persist all records atomically.
 *
 * Security guarantees:
 *   - correctOptions loaded from DB, never from client payload
 *   - isCorrect and pointsAwarded computed server-side via gradeResponses()
 *   - Ownership verified: attempt must belong to submitting student
 *   - Double-submit prevented: already-submitted attempts return ALREADY_SUBMITTED
 *   - Partial submission: unanswered questions count as 0 towards score
 *
 * @param input     - Zod-validated submission (unknown fields already stripped)
 * @param studentId - The Student.id of the submitting student
 */
export async function gradeAndSubmit(
  input: SubmitInput,
  studentId: string
): Promise<SubmitResult> {
  // 1. Load the attempt and verify ownership + state
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: input.attemptId },
    select: {
      id: true,
      studentId: true,
      attemptNumber: true,
      submittedAt: true,
      assessmentId: true,
    },
  })

  if (!attempt) {
    throw new AssessmentError(
      `Attempt ${input.attemptId} not found`,
      'NOT_FOUND'
    )
  }

  // Ownership guard — prevent horizontal privilege escalation
  if (attempt.studentId !== studentId) {
    throw new AssessmentError(
      'This attempt does not belong to the current student',
      'FORBIDDEN'
    )
  }

  // Double-submit guard
  if (attempt.submittedAt !== null) {
    throw new AssessmentError(
      `Attempt ${input.attemptId} has already been submitted`,
      'ALREADY_SUBMITTED'
    )
  }

  // 2. Load assessment type + question points
  const assessment = await prisma.assessment.findUnique({
    where: { id: attempt.assessmentId },
    select: {
      assessmentType: true,
      masteryThreshold: true,
    },
  })

  if (!assessment) {
    throw new AssessmentError(
      `Assessment for attempt ${input.attemptId} not found`,
      'NOT_FOUND'
    )
  }

  // 3a. Mastery Challenge reading-load level-2 minimum (Audit 7 item 2)
  if (assessment.assessmentType === 'MASTERY_CHALLENGE') {
    const questionLevels = await prisma.assessmentQuestion.findMany({
      where: { assessmentId: attempt.assessmentId },
      select: { question: { select: { id: true, readingLoadLevel: true } } },
    })
    const belowLevel2 = questionLevels.filter(
      (aq) => aq.question.readingLoadLevel < 2
    )
    if (belowLevel2.length > 0) {
      throw new AssessmentError(
        `Mastery Challenge contains ${belowLevel2.length} question(s) below reading-load level 2. ` +
          'Resolve content configuration before accepting submissions.',
        'INVALID_CONTENT'
      )
    }
  }

  // 3b. Validate confidence requirement (Audit 3 item 3)
  if (CONFIDENCE_REQUIRED_TYPES.has(assessment.assessmentType)) {
    const missingConfidence = input.responses.some(
      (r) => r.confidence === undefined || r.confidence === null
    )
    if (missingConfidence) {
      throw new AssessmentError(
        `Confidence rating is required for all responses on a ${assessment.assessmentType}`,
        'CONFIDENCE_REQUIRED'
      )
    }
  }

  // 4. Load all question IDs for this assessment (needed for score denominator)
  const allPoints = await fetchQuestionPoints(attempt.assessmentId)
  const questionIds = Array.from(allPoints.keys())

  // 5. Fetch correct answers SERVER-SIDE — never trust client
  const correctOptions = await fetchCorrectOptions(questionIds)

  // 6. Grade responses (pure function — tamper-safe)
  const grades = gradeResponses(input.responses, correctOptions, allPoints)

  // 7. Compute score (denominator = ALL questions, not just submitted ones)
  const { score, passed } = computeScore(grades, allPoints, assessment.masteryThreshold)

  // 8. Persist: update attempt + create all responses atomically
  const submittedAt = new Date()

  await prisma.$transaction([
    prisma.assessmentAttempt.update({
      where: { id: attempt.id },
      data: { score, passed, submittedAt },
    }),
    ...grades.map((grade) =>
      prisma.attemptResponse.create({
        data: {
          attemptId: attempt.id,
          questionId: grade.questionId,
          responseJson: { selectedOptionId: grade.selectedOptionId },
          selectedOptionId: grade.selectedOptionId,
          isCorrect: grade.isCorrect,    // server-computed
          pointsAwarded: grade.pointsAwarded, // server-computed
          confidence: grade.confidence,
          timeSeconds: grade.timeSeconds,
        },
      })
    ),
  ])

  // 9. Build result — feedback only for PRACTICE mode (Audit 3 item 5)
  let feedback: FeedbackItem[] | null = null

  if (PRACTICE_ASSESSMENT_TYPES.has(assessment.assessmentType)) {
    const submittedOptionIds = grades.map((g) => g.selectedOptionId)
    const feedbackMap = await fetchOptionFeedback(submittedOptionIds)

    feedback = grades.map((grade) => ({
      questionId: grade.questionId,
      selectedOptionId: grade.selectedOptionId,
      isCorrect: grade.isCorrect,
      feedback: feedbackMap.get(grade.selectedOptionId) ?? null,
    }))
  }

  return {
    attemptId: attempt.id,
    attemptNumber: attempt.attemptNumber,
    score,
    passed,
    feedback,
  }
}
