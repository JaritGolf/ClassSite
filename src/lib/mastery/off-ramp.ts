/**
 * Off-Ramp Logic
 *
 * Evaluates whether a student has met all three conditions for the off-ramp:
 *   1. Three failed MASTERY_CHALLENGE attempts for the benchmark
 *   2. At least one remediation completed for the benchmark
 *   3. At least 7 days elapsed since the first failed attempt
 *
 * If all conditions are met, sets StudentProgress.status to EXPOSURE_COMPLETE,
 * halves SpacedReviewState.intervalDays (if it exists), and creates an AuditLog
 * entry to flag the teacher dashboard.
 *
 * Spec reference: Section 12.4
 */

import { prisma } from '@/lib/db'

// ── Pure helper — exported for unit testing ───────────────────────────────────

/**
 * Determine whether off-ramp conditions are satisfied from raw counts and dates.
 * Pure function — no DB access. Unit-testable without mocking.
 *
 * @param failedAttemptCount        - Number of failed MASTERY_CHALLENGE attempts
 * @param completedRemediationCount - Number of COMPLETED StudentRemediation rows
 * @param firstAttemptDate          - startedAt of the earliest failed attempt
 * @param now                       - Current timestamp (passed in for testability)
 */
export function isOffRampConditionMet(
  failedAttemptCount: number,
  completedRemediationCount: number,
  firstAttemptDate: Date,
  now: Date
): boolean {
  if (failedAttemptCount < 3) return false
  if (completedRemediationCount < 1) return false

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  const elapsed = now.getTime() - firstAttemptDate.getTime()
  return elapsed >= sevenDaysMs
}

// ── DB-backed check-and-trigger ───────────────────────────────────────────────

/**
 * Check whether the off-ramp should fire for a student on a given benchmark,
 * and if so, fire it (update status, halve interval, write audit log).
 *
 * Idempotent: if `offRampTriggeredAt` is already set, returns false immediately.
 *
 * @param studentId   - The Student.id
 * @param benchmarkId - The Benchmark.id
 * @returns true if off-ramp was triggered this call, false otherwise
 */
export async function checkOffRamp(
  studentId: string,
  benchmarkId: string
): Promise<boolean> {
  // Guard: already triggered
  const progress = await prisma.studentProgress.findUnique({
    where: { studentId_benchmarkId: { studentId, benchmarkId } },
    select: { offRampTriggeredAt: true },
  })

  if (progress?.offRampTriggeredAt) return false

  // Count failed MASTERY_CHALLENGE attempts for this benchmark
  const failedAttempts = await prisma.assessmentAttempt.findMany({
    where: {
      studentId,
      passed: false,
      assessment: {
        benchmarkId,
        assessmentType: 'MASTERY_CHALLENGE',
      },
    },
    orderBy: { startedAt: 'asc' },
    select: { id: true, startedAt: true },
  })

  // Count completed remediations
  const completedRemCount = await prisma.studentRemediation.count({
    where: { studentId, benchmarkId, status: 'COMPLETED' },
  })

  // Evaluate pure condition
  const conditionMet = isOffRampConditionMet(
    failedAttempts.length,
    completedRemCount,
    failedAttempts[0]?.startedAt ?? new Date(),
    new Date()
  )

  if (!conditionMet) return false

  // ── All conditions met — trigger off-ramp ──────────────────────────────────

  const now = new Date()

  // Update StudentProgress + write AuditLog atomically
  await prisma.$transaction([
    prisma.studentProgress.update({
      where: { studentId_benchmarkId: { studentId, benchmarkId } },
      data: { status: 'EXPOSURE_COMPLETE', offRampTriggeredAt: now },
    }),
    prisma.auditLog.create({
      data: {
        actorUserId: null, // system-triggered
        action: 'OFF_RAMP_TRIGGERED',
        entityType: 'StudentProgress',
        entityId: null,
        metadataJson: {
          studentId,
          benchmarkId,
          triggeredAt: now.toISOString(),
          failedAttemptCount: failedAttempts.length,
          completedRemediationCount: completedRemCount,
        },
      },
    }),
  ])

  // Halve SpacedReviewState.intervalDays if the row exists
  // (Most off-ramp students won't have a SpacedReviewState — graceful skip)
  const srs = await prisma.spacedReviewState.findUnique({
    where: { studentId_benchmarkId: { studentId, benchmarkId } },
    select: { intervalDays: true },
  })

  if (srs) {
    await prisma.spacedReviewState.update({
      where: { studentId_benchmarkId: { studentId, benchmarkId } },
      data: { intervalDays: Math.max(1, Math.floor(srs.intervalDays / 2)) },
    })
  }

  return true
}
