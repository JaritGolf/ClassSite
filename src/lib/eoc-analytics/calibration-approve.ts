/**
 * EOC Calibration Run Approval
 *
 * Admin explicitly approves a calibration run, marking it applied=true.
 *
 * CRITICAL NOTE: Approving a run does NOT mutate REPORTING_CATEGORY_WEIGHTS
 * in code. The constant remains hard-coded in readiness.ts. The approved
 * recommended weights are stored only in the EocCalibrationRun.recommendedWeightChanges
 * DB column. Future Phase 13 work will read the latest applied run at startup
 * to load dynamic weights. This is by design — non-negotiable per spec §20.5
 * and CLAUDE.md rule "Calibration weight changes: Never auto-apply."
 *
 * Spec reference: Section 20.5 (Calibration Feedback Loop)
 */

import { prisma } from '@/lib/db'

// ── Error Types ────────────────────────────────────────────────────────────────

export class ApprovalError extends Error {
  constructor(
    message: string,
    public readonly code: 'NOT_FOUND' | 'ALREADY_APPLIED' | 'INVALID_STATE'
  ) {
    super(message)
    this.name = 'ApprovalError'
  }
}

// ── Main Function ──────────────────────────────────────────────────────────────

/**
 * Approve a pending calibration run.
 *
 * @param actorUserId - User.id of the admin approving the run
 * @param runId - EocCalibrationRun.id to approve
 * @param reason - Human-readable justification (stored in audit log)
 * @throws ApprovalError('NOT_FOUND') if run does not exist
 * @throws ApprovalError('ALREADY_APPLIED') if run has already been applied
 * @returns { auditLogId }
 */
export async function approveCalibrationRun(
  actorUserId: string,
  runId: string,
  reason: string
): Promise<{ auditLogId: string }> {
  // 1. Load the run
  const run = await prisma.eocCalibrationRun.findUnique({
    where: { id: runId },
    select: {
      id: true,
      schoolYear: true,
      recommendedWeightChanges: true,
      applied: true,
    },
  })

  if (!run) {
    throw new ApprovalError(`EocCalibrationRun ${runId} not found`, 'NOT_FOUND')
  }

  // 2. Reject if already applied
  if (run.applied) {
    throw new ApprovalError(
      `EocCalibrationRun ${runId} has already been applied`,
      'ALREADY_APPLIED'
    )
  }

  // 3. $transaction: update applied=true + AuditLog
  //
  // IMPORTANT: This does NOT mutate REPORTING_CATEGORY_WEIGHTS in readiness.ts.
  // The constant remains hard-coded. Only the DB row is updated.
  // See module-level docblock for Phase 13 roadmap.
  const { auditLogId } = await prisma.$transaction(async (tx) => {
    await tx.eocCalibrationRun.update({
      where: { id: runId },
      data: { applied: true },
    })

    const auditLog = await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'CALIBRATION_WEIGHTS_APPROVED',
        entityType: 'EocCalibrationRun',
        entityId: runId,
        metadataJson: {
          schoolYear: run.schoolYear,
          recommendedWeightChanges: run.recommendedWeightChanges,
          reason,
        },
      },
      select: { id: true },
    })

    return { auditLogId: auditLog.id }
  })

  return { auditLogId }
}
