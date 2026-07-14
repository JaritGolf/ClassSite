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
import {
  computeCalibrationBreakdown,
  recordCalibrationSnapshot,
  type CalibrationBreakdown,
} from '@/lib/metacognition'

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
      | 'READINESS_REQUIRED'
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
  /** Per-confidence-level correctness, only for confidence-required types (spec §17.4) */
  calibration: CalibrationBreakdown | null
  /**
   * READINESS_CHECK only: human-readable topic labels (from skill tags) of the
   * questions missed or skipped, so the mission flow can point the student back
   * at the right training material. Post-submission, topic-level only — no
   * answer keys, no per-question correctness (rule #2 stays intact).
   */
  reviewTopics: string[] | null
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
 * @throws AssessmentError READINESS_REQUIRED for a Mastery Challenge whose
 *         benchmark has a Readiness Check the student has not yet passed
 */
export async function startAttempt(
  assessmentId: string,
  studentId: string
): Promise<StartAttemptResult> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { id: true, assessmentType: true, masteryThreshold: true, benchmarkId: true },
  })

  if (!assessment) {
    throw new AssessmentError(
      `Assessment ${assessmentId} not found`,
      'NOT_FOUND'
    )
  }

  // Server-side readiness gate (spec §10.4 steps 6–7): the readiness→mastery
  // order must not live only in client state — a student who deep-links the
  // mastery assessment URL would otherwise skip all learning. Benchmarks with
  // no readiness check configured are exempt (ad-hoc assessments still work).
  if (assessment.assessmentType === 'MASTERY_CHALLENGE' && assessment.benchmarkId) {
    const readiness = await prisma.assessment.findFirst({
      where: {
        benchmarkId: assessment.benchmarkId,
        assessmentType: 'READINESS_CHECK',
      },
      select: { id: true },
    })
    if (readiness) {
      const passedReadiness = await prisma.assessmentAttempt.findFirst({
        where: {
          studentId,
          passed: true,
          voided: false,
          assessment: {
            benchmarkId: assessment.benchmarkId,
            assessmentType: 'READINESS_CHECK',
          },
        },
        select: { id: true },
      })
      if (!passedReadiness) {
        throw new AssessmentError(
          'Pass the Training Check for this mission before starting the Mastery Challenge',
          'READINESS_REQUIRED'
        )
      }
    }
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
      benchmark: { select: { code: true } },
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

  // 9b. Review topics — which concepts to revisit, at topic level only
  //     (no per-question correctness, no keys). Missed = wrong OR unanswered.
  //     READINESS_CHECK (fail): points the student back at the right training.
  //     PRE_CHECK (any score): powers the "here's what this mission will teach
  //     you" recap — the pre-check result is otherwise thrown away.
  let reviewTopics: string[] | null = null

  const wantsReviewTopics =
    (assessment.assessmentType === 'READINESS_CHECK' && !passed) ||
    assessment.assessmentType === 'PRE_CHECK'

  if (wantsReviewTopics) {
    const answeredCorrectly = new Set(
      grades.filter((g) => g.isCorrect).map((g) => g.questionId)
    )
    const missedIds = questionIds.filter((id) => !answeredCorrectly.has(id))
    if (missedIds.length > 0) {
      const missedQuestions = await prisma.question.findMany({
        where: { id: { in: missedIds } },
        select: { skillTag: true },
      })
      const topics = new Set(
        missedQuestions
          .map((q) => q.skillTag)
          .filter((t): t is string => Boolean(t))
          .map((t) => t.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
      )
      reviewTopics = [...topics]
    }
  }

  // 10. Calibration feedback (spec §17.4) — only for confidence-required types.
  //     The snapshot write is non-fatal: the submission is already persisted.
  let calibration: CalibrationBreakdown | null = null

  if (CONFIDENCE_REQUIRED_TYPES.has(assessment.assessmentType)) {
    calibration = computeCalibrationBreakdown(grades)
    try {
      await recordCalibrationSnapshot(studentId, 'overall', calibration)
      if (assessment.benchmark?.code) {
        await recordCalibrationSnapshot(
          studentId,
          `benchmark:${assessment.benchmark.code}`,
          calibration
        )
      }
    } catch (snapshotErr) {
      console.error(
        '[metacognition/recordCalibrationSnapshot]',
        snapshotErr instanceof Error ? snapshotErr.message : snapshotErr
      )
    }
  }

  return {
    attemptId: attempt.id,
    attemptNumber: attempt.attemptNumber,
    score,
    passed,
    feedback,
    calibration,
    reviewTopics,
  }
}
