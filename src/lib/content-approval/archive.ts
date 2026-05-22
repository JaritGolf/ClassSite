/**
 * Content Approval — Archive a single content item
 *
 * Sets approvalStatus = ARCHIVED and writes an AuditLog entry,
 * all within a $transaction.
 */

import { prisma } from '@/lib/db'
import type { ApprovableEntity } from './entity-map'
import { updateApprovalStatus } from './approve'

/**
 * Archive a single content item.
 *
 * @param actorUserId - User.id of the acting teacher/admin
 * @param entityType  - Content type
 * @param entityId    - The content item's id
 * @param reason      - Required human-readable justification
 */
export async function archiveContent(
  actorUserId: string,
  entityType: ApprovableEntity,
  entityId: string,
  reason: string
): Promise<{ auditLogId: string }> {
  const result = await prisma.$transaction(async (tx) => {
    await updateApprovalStatus(tx, entityType, entityId, 'ARCHIVED')

    const log = await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'ARCHIVE_CONTENT',
        entityType,
        entityId,
        metadataJson: { entityType, entityId, reason },
      },
      select: { id: true },
    })

    return log
  })

  return { auditLogId: result.id }
}
