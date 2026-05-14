/**
 * Mastery Status Updater
 *
 * Called after gradeAndSubmit() resolves to update StudentProgress based on
 * the attempt outcome. This is the main Phase 4 orchestrator:
 *
 *   - On pass (score >= masteryThreshold): set MASTERED, unlock next benchmark,
 *     create SpacedReviewState entry
 *   - On fail: check off-ramp conditions, update to NEEDS_REMEDIATION or
 *     EXPOSURE_COMPLETE, assign remediation items
 *   - Non-MASTERY_CHALLENGE types: no-op (progress not affected)
 *
 * IMPORTANT: failures here are NON-FATAL for the student's submission.
 * The submit route catches and logs errors from this function without
 * surfacing them to the student.
 */

import { prisma } from '@/lib/db'
import { unlockNextBenchmark } from './unlock'
import { checkOffRamp } from './off-ramp'
import { assignRemediation } from '../remediation/assign'
import type { StudentProgressStatus } from '@prisma/client'

// ── Error Types ───────────────────────────────────────────────────────────────

export class MasteryError extends Error {
  constructor(
    message: string,
    public readonly code: 'NOT_FOUND' | 'FORBIDDEN' | 'NOT_SUBMITTED'
  ) {
    super(message)
    this.name = 'MasteryError'
  }
}

// ── Result Types ──────────────────────────────────────────────────────────────

export interface ProgressUpdateResult {
  benchmarkId: string
  newStatus: StudentProgressStatus
  masteryScore: number | null
  remediationAssigned: boolean
  nextBenchmarkUnlocked: boolean
  offRampTriggered: boolean
}

// ── Assessment types that affect mastery status ───────────────────────────────

// Only MASTERY_CHALLENGE and REASSESSMENT attempts drive StudentProgress updates.
const MASTERY_AFFECTING_TYPES = new Set(['MASTERY_CHALLENGE', 'REASSESSMENT'])

// ── Main Function ─────────────────────────────────────────────────────────────

/**
 * Update StudentProgress after a graded attempt.
 *
 * @param attemptId - The AssessmentAttempt.id (already graded and submitted)
 * @param studentId - The Student.id of the submitting student
 * @throws MasteryError NOT_FOUND if attempt doesn't exist
 * @throws MasteryError FORBIDDEN if attempt belongs to a different student
 * @throws MasteryError NOT_SUBMITTED if attempt has not been graded yet
 */
export async function updateProgressAfterAttempt(
  attemptId: string,
  studentId: string
): Promise<ProgressUpdateResult> {
  // 1. Load the attempt with assessment context
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      studentId: true,
      score: true,
      passed: true,
      assessment: {
        select: {
          assessmentType: true,
          benchmarkId: true,
          masteryThreshold: true,
        },
      },
    },
  })

  if (!attempt) {
    throw new MasteryError(`Attempt ${attemptId} not found`, 'NOT_FOUND')
  }

  if (attempt.studentId !== studentId) {
    throw new MasteryError(
      'This attempt does not belong to the current student',
      'FORBIDDEN'
    )
  }

  if (attempt.score === null) {
    throw new MasteryError(
      `Attempt ${attemptId} has not been graded yet`,
      'NOT_SUBMITTED'
    )
  }

  const { assessmentType, benchmarkId, masteryThreshold } = attempt.assessment

  // 2. Only act on mastery-affecting assessment types
  if (!MASTERY_AFFECTING_TYPES.has(assessmentType)) {
    return {
      benchmarkId,
      newStatus: 'IN_PROGRESS',
      masteryScore: null,
      remediationAssigned: false,
      nextBenchmarkUnlocked: false,
      offRampTriggered: false,
    }
  }

  // 3. Upsert the StudentProgress row (creates if not exists, increments if exists)
  await prisma.studentProgress.upsert({
    where: { studentId_benchmarkId: { studentId, benchmarkId } },
    create: {
      studentId,
      benchmarkId,
      status: 'IN_PROGRESS',
      attemptsCount: 1,
    },
    update: {
      attemptsCount: { increment: 1 },
    },
  })

  // 4. Branch on pass/fail
  const passed = attempt.passed ?? false

  if (passed) {
    // ── PASSED ──────────────────────────────────────────────────────────────

    const masteryScore = attempt.score

    // Update progress to MASTERED
    await prisma.studentProgress.update({
      where: { studentId_benchmarkId: { studentId, benchmarkId } },
      data: {
        status: 'MASTERED',
        masteryScore,
        masteredAt: new Date(),
      },
    })

    // Unlock the next benchmark (creates NOT_STARTED row if not already present)
    const nextUnlocked = await unlockNextBenchmark(studentId, benchmarkId)

    // Seed SpacedReviewState for this benchmark — due in 1 day
    // Use upsert with empty update so an existing row is not clobbered
    await prisma.spacedReviewState.upsert({
      where: { studentId_benchmarkId: { studentId, benchmarkId } },
      create: {
        studentId,
        benchmarkId,
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      update: {}, // intentional no-op if row already exists
    })

    return {
      benchmarkId,
      newStatus: 'MASTERED',
      masteryScore,
      remediationAssigned: false,
      nextBenchmarkUnlocked: nextUnlocked,
      offRampTriggered: false,
    }
  } else {
    // ── FAILED ──────────────────────────────────────────────────────────────

    // Check whether off-ramp conditions are now satisfied
    const offRampTriggered = await checkOffRamp(studentId, benchmarkId)

    if (offRampTriggered) {
      // Off-ramp was triggered — EXPOSURE_COMPLETE, next benchmark unlocked
      const nextUnlocked = await unlockNextBenchmark(studentId, benchmarkId)

      return {
        benchmarkId,
        newStatus: 'EXPOSURE_COMPLETE',
        masteryScore: null,
        remediationAssigned: false,
        nextBenchmarkUnlocked: nextUnlocked,
        offRampTriggered: true,
      }
    }

    // Not yet off-ramp — assign targeted remediation
    await prisma.studentProgress.update({
      where: { studentId_benchmarkId: { studentId, benchmarkId } },
      data: { status: 'NEEDS_REMEDIATION' },
    })

    const remResult = await assignRemediation(studentId, benchmarkId, attemptId)

    return {
      benchmarkId,
      newStatus: 'NEEDS_REMEDIATION',
      masteryScore: null,
      remediationAssigned: remResult.count > 0,
      nextBenchmarkUnlocked: false,
      offRampTriggered: false,
    }
  }
}
