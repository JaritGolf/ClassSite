/**
 * Content Approval — Approve a single content item
 *
 * Sets approvalStatus = APPROVED and writes an AuditLog entry,
 * all within a $transaction.
 */

import { prisma } from '@/lib/db'
import type { ApprovableEntity } from './entity-map'

/**
 * Approve a single content item.
 *
 * @param actorUserId - User.id of the approving teacher/admin
 * @param entityType  - Content type
 * @param entityId    - The content item's id
 */
export async function approveContent(
  actorUserId: string,
  entityType: ApprovableEntity,
  entityId: string
): Promise<{ auditLogId: string }> {
  const result = await prisma.$transaction(async (tx) => {
    // Update the entity's approvalStatus to APPROVED
    await updateApprovalStatus(tx, entityType, entityId, 'APPROVED')

    const log = await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'APPROVE_CONTENT',
        entityType,
        entityId,
        metadataJson: { entityType, entityId },
      },
      select: { id: true },
    })

    return log
  })

  return { auditLogId: result.id }
}

/**
 * Update the approvalStatus on any approvable entity.
 * Uses a dynamic accessor pattern — Prisma models are keyed by camelCase name.
 */
async function updateApprovalStatus(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  entityType: ApprovableEntity,
  entityId: string,
  newStatus: 'APPROVED' | 'ARCHIVED'
) {
  const modelMap: Record<ApprovableEntity, (id: string, status: 'APPROVED' | 'ARCHIVED') => Promise<unknown>> = {
    QUESTION: (id, s) => tx.question.update({ where: { id }, data: { approvalStatus: s } }),
    LESSON: (id, s) => tx.lesson.update({ where: { id }, data: { approvalStatus: s } }),
    TERM: (id, s) => tx.term.update({ where: { id }, data: { approvalStatus: s } }),
    RESOURCE: (id, s) => tx.resource.update({ where: { id }, data: { approvalStatus: s } }),
    REMEDIATION_ITEM: (id, s) => tx.remediationItem.update({ where: { id }, data: { approvalStatus: s } }),
    STIMULUS: (id, s) => tx.stimulus.update({ where: { id }, data: { approvalStatus: s } }),
    MISCONCEPTION: (id, s) => tx.misconception.update({ where: { id }, data: { approvalStatus: s } }),
  }

  await modelMap[entityType](entityId, newStatus)
}

export { updateApprovalStatus }
