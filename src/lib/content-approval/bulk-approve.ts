/**
 * Content Approval — Bulk Approve By Tag/Filter
 *
 * Approves all matching content items in a single $transaction:
 *   - updateMany sets approvalStatus = APPROVED
 *   - Single AuditLog with metadataJson: { criteria, itemIds, count }
 *
 * Spec reference: Phase 9 slice 9c, Audit 9 item 6.
 */

import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import type { ApprovableEntity } from './entity-map'

export interface BulkApproveCriteria {
  entityType: ApprovableEntity
  benchmarkId?: string
  reportingCategoryId?: string
  unitId?: string
  /** Explicit subset — overrides filter when provided */
  ids?: string[]
}

/**
 * Bulk-approve content items matching the criteria.
 *
 * @param actorUserId - User.id of the acting teacher/admin
 * @param criteria    - Filters identifying items to approve
 */
export async function bulkApproveByTag(
  actorUserId: string,
  criteria: BulkApproveCriteria
): Promise<{ approvedCount: number; itemIds: string[]; auditLogId: string }> {
  const { entityType, benchmarkId, reportingCategoryId, unitId, ids } = criteria

  // Resolve item IDs to approve
  const itemIds = ids?.length ? ids : await resolveItemIds(entityType, { benchmarkId, reportingCategoryId, unitId })

  if (itemIds.length === 0) {
    // Nothing to approve — still write audit log with empty list
    const log = await prisma.auditLog.create({
      data: {
        actorUserId,
        action: 'BULK_APPROVE_CONTENT',
        entityType,
        metadataJson: { criteria: criteria as unknown as Prisma.JsonObject, itemIds: [] as string[], count: 0 } as Prisma.JsonObject,
      },
      select: { id: true },
    })
    return { approvedCount: 0, itemIds: [], auditLogId: log.id }
  }

  const result = await prisma.$transaction(async (tx) => {
    // Update all matching items to APPROVED
    const updateFn = buildUpdateMany(entityType)
    await updateFn(tx, itemIds)

    const log = await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'BULK_APPROVE_CONTENT',
        entityType,
        metadataJson: { criteria: criteria as unknown as Prisma.JsonObject, itemIds, count: itemIds.length } as Prisma.JsonObject,
      },
      select: { id: true },
    })

    return log
  })

  return { approvedCount: itemIds.length, itemIds, auditLogId: result.id }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function resolveItemIds(
  entityType: ApprovableEntity,
  filters: { benchmarkId?: string; reportingCategoryId?: string; unitId?: string }
): Promise<string[]> {
  const baseWhere: Record<string, unknown> = {
    approvalStatus: { in: ['DRAFT', 'NEEDS_REVIEW', 'NEEDS_REVISION'] },
  }
  if (filters.benchmarkId) baseWhere.benchmarkId = filters.benchmarkId
  if (filters.reportingCategoryId)
    baseWhere.benchmark = { reportingCategoryId: filters.reportingCategoryId }
  if (filters.unitId) baseWhere.benchmark = { unitId: filters.unitId }

  type ItemWithId = { id: string }

  const findFns: Record<ApprovableEntity, () => Promise<ItemWithId[]>> = {
    QUESTION: () => prisma.question.findMany({ where: baseWhere, select: { id: true } }),
    LESSON: () => prisma.lesson.findMany({ where: baseWhere, select: { id: true } }),
    TERM: () => prisma.term.findMany({ where: baseWhere, select: { id: true } }),
    TERM_TRANSLATION: () => prisma.termTranslation.findMany({
      where: { approvalStatus: { in: ['DRAFT', 'NEEDS_REVIEW', 'NEEDS_REVISION'] } },
      select: { id: true },
    }),
    RESOURCE: () => prisma.resource.findMany({ where: baseWhere, select: { id: true } }),
    REMEDIATION_ITEM: () => prisma.remediationItem.findMany({ where: baseWhere, select: { id: true } }),
    STIMULUS: () => prisma.stimulus.findMany({
      where: { approvalStatus: { in: ['DRAFT', 'NEEDS_REVIEW', 'NEEDS_REVISION'] } },
      select: { id: true },
    }),
    MISCONCEPTION: () => prisma.misconception.findMany({
      where: { approvalStatus: { in: ['DRAFT', 'NEEDS_REVIEW', 'NEEDS_REVISION'] } },
      select: { id: true },
    }),
  }

  const items = await findFns[entityType]()
  return items.map((i) => i.id)
}

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

function buildUpdateMany(
  entityType: ApprovableEntity
): (tx: TxClient, ids: string[]) => Promise<unknown> {
  const updateMap: Record<ApprovableEntity, (tx: TxClient, ids: string[]) => Promise<unknown>> = {
    QUESTION: (tx, ids) =>
      tx.question.updateMany({ where: { id: { in: ids } }, data: { approvalStatus: 'APPROVED' } }),
    LESSON: (tx, ids) =>
      tx.lesson.updateMany({ where: { id: { in: ids } }, data: { approvalStatus: 'APPROVED' } }),
    TERM: (tx, ids) =>
      tx.term.updateMany({ where: { id: { in: ids } }, data: { approvalStatus: 'APPROVED' } }),
    TERM_TRANSLATION: (tx, ids) =>
      tx.termTranslation.updateMany({ where: { id: { in: ids } }, data: { approvalStatus: 'APPROVED' } }),
    RESOURCE: (tx, ids) =>
      tx.resource.updateMany({ where: { id: { in: ids } }, data: { approvalStatus: 'APPROVED' } }),
    REMEDIATION_ITEM: (tx, ids) =>
      tx.remediationItem.updateMany({ where: { id: { in: ids } }, data: { approvalStatus: 'APPROVED' } }),
    STIMULUS: (tx, ids) =>
      tx.stimulus.updateMany({ where: { id: { in: ids } }, data: { approvalStatus: 'APPROVED' } }),
    MISCONCEPTION: (tx, ids) =>
      tx.misconception.updateMany({ where: { id: { in: ids } }, data: { approvalStatus: 'APPROVED' } }),
  }
  return updateMap[entityType]
}
