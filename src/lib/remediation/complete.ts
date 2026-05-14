/**
 * Remediation Completion
 *
 * Marks a StudentRemediation as COMPLETED and checks if all assigned
 * remediations for this benchmark are done. If so, advances
 * StudentProgress to REMEDIATION_COMPLETE.
 */

import { prisma } from '@/lib/db'
import type { StudentProgressStatus } from '@prisma/client'

// ── Error Types ───────────────────────────────────────────────────────────────

export class RemediationError extends Error {
  constructor(
    message: string,
    public readonly code: 'NOT_FOUND' | 'FORBIDDEN' | 'ALREADY_COMPLETED'
  ) {
    super(message)
    this.name = 'RemediationError'
  }
}

// ── Result Types ──────────────────────────────────────────────────────────────

export interface CompleteRemediationResult {
  studentRemediationId: string
  allRemediationsComplete: boolean
  newProgressStatus: StudentProgressStatus
}

// ── Main Function ─────────────────────────────────────────────────────────────

/**
 * Complete a specific StudentRemediation activity.
 *
 * Verifies ownership, marks the row COMPLETED, then checks if all active
 * remediations for this student+benchmark are done. If so, advances
 * StudentProgress to REMEDIATION_COMPLETE.
 *
 * @param studentRemediationId - The StudentRemediation.id to complete
 * @param studentId            - The Student.id of the student completing it
 * @throws RemediationError NOT_FOUND if the row doesn't exist
 * @throws RemediationError FORBIDDEN if row belongs to a different student
 * @throws RemediationError ALREADY_COMPLETED if already done
 */
export async function completeRemediation(
  studentRemediationId: string,
  studentId: string
): Promise<CompleteRemediationResult> {
  // 1. Load the row and verify ownership
  const row = await prisma.studentRemediation.findUnique({
    where: { id: studentRemediationId },
    select: {
      id: true,
      studentId: true,
      benchmarkId: true,
      status: true,
    },
  })

  if (!row) {
    throw new RemediationError(
      `StudentRemediation ${studentRemediationId} not found`,
      'NOT_FOUND'
    )
  }

  if (row.studentId !== studentId) {
    throw new RemediationError(
      'This remediation activity does not belong to the current student',
      'FORBIDDEN'
    )
  }

  if (row.status === 'COMPLETED') {
    throw new RemediationError(
      `StudentRemediation ${studentRemediationId} is already completed`,
      'ALREADY_COMPLETED'
    )
  }

  // 2. Mark this row as COMPLETED
  await prisma.studentRemediation.update({
    where: { id: studentRemediationId },
    data: { status: 'COMPLETED', completedAt: new Date() },
  })

  // 3. Check if any active remediations remain for this student+benchmark
  const remainingCount = await prisma.studentRemediation.count({
    where: {
      studentId,
      benchmarkId: row.benchmarkId,
      status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
    },
  })

  if (remainingCount > 0) {
    return {
      studentRemediationId,
      allRemediationsComplete: false,
      newProgressStatus: 'NEEDS_REMEDIATION',
    }
  }

  // 4. All done — advance StudentProgress to REMEDIATION_COMPLETE
  await prisma.studentProgress.update({
    where: {
      studentId_benchmarkId: {
        studentId,
        benchmarkId: row.benchmarkId,
      },
    },
    data: { status: 'REMEDIATION_COMPLETE' },
  })

  return {
    studentRemediationId,
    allRemediationsComplete: true,
    newProgressStatus: 'REMEDIATION_COMPLETE',
  }
}
