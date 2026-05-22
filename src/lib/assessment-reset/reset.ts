/**
 * Assessment Reset
 *
 * Allows a teacher to void an existing attempt.
 * Void-in-place: sets voided=true, score=null, passed=null, submittedAt=now().
 * Never hard-deletes anything.
 *
 * Writes an AuditLog row inside the same $transaction.
 *
 * Spec reference: Phase 9 slice 9c.
 */

import { prisma } from '@/lib/db'
import { assertStudentInTeacherClass } from '@/lib/teacher-roster'

// ── Error Types ────────────────────────────────────────────────────────────────

export class ResetError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'FORBIDDEN' | 'INVALID_STATE',
    message: string
  ) {
    super(message)
    this.name = 'ResetError'
  }
}

// ── Main Function ──────────────────────────────────────────────────────────────

/**
 * Void an assessment attempt.
 *
 * @param actorUserId - User.id of the acting teacher
 * @param attemptId   - AssessmentAttempt.id to void
 * @param reason      - Required human-readable justification
 * @throws ResetError NOT_FOUND if attempt doesn't exist
 * @throws ResetError FORBIDDEN if student is not in teacher's class
 * @throws ResetError INVALID_STATE if attempt is already voided
 */
export async function resetAttempt(
  actorUserId: string,
  attemptId: string,
  reason: string
): Promise<{ auditLogId: string }> {
  // 1. Load the attempt
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      studentId: true,
      score: true,
      passed: true,
      submittedAt: true,
      voided: true,
    },
  })

  if (!attempt) {
    throw new ResetError('NOT_FOUND', `Assessment attempt ${attemptId} not found`)
  }

  // 2. Verify teacher has access to this student
  await assertStudentInTeacherClass(actorUserId, attempt.studentId)

  // 3. Guard against double-void
  if (attempt.voided) {
    throw new ResetError('INVALID_STATE', `Attempt ${attemptId} is already voided`)
  }

  // 4. Void in-place within a $transaction
  const result = await prisma.$transaction(async (tx) => {
    await tx.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        voided: true,
        score: null,
        passed: null,
        submittedAt: new Date(),
      },
    })

    const log = await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'RESET_ATTEMPT',
        entityType: 'AssessmentAttempt',
        entityId: attemptId,
        metadataJson: {
          snapshot: {
            originalScore: attempt.score,
            originalPassed: attempt.passed,
            originalSubmittedAt: attempt.submittedAt?.toISOString() ?? null,
          },
          reason,
        },
      },
      select: { id: true },
    })

    return log
  })

  return { auditLogId: result.id }
}
