/**
 * Spaced Review Submission
 *
 * Records a SpacedReviewEvent and updates the SM-2 state for a
 * (student, benchmark) pair after a drill answer is submitted.
 *
 * Spec reference: Section 15.2 (SM-2 update) + Section 15.4 (off-ramp halving)
 *
 * Off-ramp recovery rule (Section 15.4):
 *   For EXPOSURE_COMPLETE benchmarks, the interval is halved after each review.
 *   Once the student achieves TWO consecutive reviews with quality >= 3,
 *   standard SM-2 progression resumes (no more halving).
 *
 * Server-side only — this module is never imported by client components.
 * Grading (isCorrect determination) must happen before calling submitReview;
 * this module only handles SM-2 bookkeeping.
 */

import { prisma } from '@/lib/db'
import { computeQuality, computeNextState, computeDueAt, halveInterval } from './sm2'
import type { Confidence } from './sm2'

// ── Error type ────────────────────────────────────────────────────────────────

export class ReviewError extends Error {
  constructor(
    message: string,
    public readonly code: 'NOT_FOUND' | 'NO_STATE'
  ) {
    super(message)
    this.name = 'ReviewError'
  }
}

// ── Result type ───────────────────────────────────────────────────────────────

export interface ReviewResult {
  quality: number
  newIntervalDays: number
  newEasinessFactor: number
  newRepetitionCount: number
  dueAt: Date
  offRampRecovered: boolean
}

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Record a spaced review answer and update SM-2 state.
 *
 * @param studentId   - The Student.id
 * @param benchmarkId - The Benchmark.id being reviewed
 * @param questionId  - The Question.id answered in this drill item
 * @param isCorrect   - Whether the student's answer was correct (server-graded)
 * @param confidence  - Student's confidence rating (0=Not sure, 1=Pretty sure, 2=Very sure)
 * @param now         - Override for current time (used in tests)
 */
export async function submitReview(
  studentId: string,
  benchmarkId: string,
  questionId: string,
  isCorrect: boolean,
  confidence: Confidence,
  now: Date = new Date()
): Promise<ReviewResult> {
  // 1. Load current SM-2 state (must exist — mastery seeded it)
  const currentState = await prisma.spacedReviewState.findUnique({
    where: { studentId_benchmarkId: { studentId, benchmarkId } },
    select: {
      repetitionCount: true,
      easinessFactor: true,
      intervalDays: true,
    },
  })

  if (!currentState) {
    throw new ReviewError(
      `No SpacedReviewState found for student ${studentId} / benchmark ${benchmarkId}`,
      'NO_STATE'
    )
  }

  // 2. Load student progress status (needed for off-ramp halving logic)
  const progress = await prisma.studentProgress.findUnique({
    where: { studentId_benchmarkId: { studentId, benchmarkId } },
    select: { status: true },
  })

  const isOffRamp = progress?.status === 'EXPOSURE_COMPLETE'

  // 3. Compute SM-2 quality and next state
  const quality = computeQuality(isCorrect, confidence)
  const nextState = computeNextState(
    {
      repetitionCount: currentState.repetitionCount,
      easinessFactor: currentState.easinessFactor,
      intervalDays: currentState.intervalDays,
    },
    quality
  )

  // 4. Apply off-ramp halving if applicable (Section 15.4)
  //    Check whether this and the previous review were both quality >= 3.
  //    If so, off-ramp recovery is achieved and standard SM-2 resumes.
  let finalIntervalDays = nextState.intervalDays
  let offRampRecovered = false

  if (isOffRamp) {
    // Load the most recent previous review event for this student+benchmark
    const lastEvent = await prisma.spacedReviewEvent.findFirst({
      where: { studentId, benchmarkId },
      orderBy: { occurredAt: 'desc' },
      select: { quality: true },
    })

    const prevQuality = lastEvent?.quality ?? -1
    const twoConsecutiveCorrect = quality >= 3 && prevQuality >= 3

    if (twoConsecutiveCorrect) {
      // Recovery achieved — standard SM-2 resumes, no halving
      offRampRecovered = true
    } else {
      // Still in aggressive review — halve the interval
      finalIntervalDays = halveInterval(nextState.intervalDays)
    }
  }

  const dueAt = computeDueAt(finalIntervalDays, now)

  // 5. Write SpacedReviewEvent + update SpacedReviewState atomically
  await prisma.$transaction([
    prisma.spacedReviewEvent.create({
      data: {
        studentId,
        benchmarkId,
        questionId,
        quality,
        confidence,
        isCorrect,
        occurredAt: now,
      },
    }),
    prisma.spacedReviewState.update({
      where: { studentId_benchmarkId: { studentId, benchmarkId } },
      data: {
        repetitionCount: nextState.repetitionCount,
        easinessFactor: nextState.easinessFactor,
        intervalDays: finalIntervalDays,
        dueAt,
        lastReviewedAt: now,
        lastQuality: quality,
      },
    }),
  ])

  return {
    quality,
    newIntervalDays: finalIntervalDays,
    newEasinessFactor: nextState.easinessFactor,
    newRepetitionCount: nextState.repetitionCount,
    dueAt,
    offRampRecovered,
  }
}

// ── Server-side grading helper ────────────────────────────────────────────────

/**
 * Determine whether a student's selected option is correct for a given question.
 * Server-side only. Used by the drill review API route.
 *
 * Returns true if the selected option has isCorrect=true in the database.
 */
export async function gradeReviewAnswer(
  questionId: string,
  selectedOptionId: string
): Promise<boolean> {
  const option = await prisma.questionOption.findFirst({
    where: { id: selectedOptionId, questionId, isCorrect: true },
    select: { id: true },
  })
  return option !== null
}
