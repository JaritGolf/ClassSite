/**
 * Audit Log — Read Helper
 *
 * Read-only helper for listing AuditLog entries.
 * Used by teacher dashboards and the admin audit viewer.
 *
 * Never exposes PII beyond what the AuditLog already stores.
 */

import { prisma } from '@/lib/db'

export interface AuditLogFilters {
  actorUserId?: string
  action?: string
  entityType?: string
  entityId?: string
  /** ISO date string or Date — filters to logs after this timestamp */
  since?: Date | string
  limit?: number
  offset?: number
}

export interface AuditLogEntry {
  id: string
  actorUserId: string | null
  action: string
  entityType: string
  entityId: string | null
  metadataJson: unknown
  createdAt: Date
}

/**
 * List AuditLog entries with optional filters.
 *
 * @param filters - Optional filter set
 */
export async function listAuditLogs(
  filters: AuditLogFilters = {}
): Promise<{ entries: AuditLogEntry[]; total: number }> {
  const { actorUserId, action, entityType, entityId, since, limit = 50, offset = 0 } = filters

  const where: Record<string, unknown> = {}
  if (actorUserId) where.actorUserId = actorUserId
  if (action) where.action = action
  if (entityType) where.entityType = entityType
  if (entityId) where.entityId = entityId
  if (since) where.createdAt = { gte: new Date(since) }

  const [entries, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      select: {
        id: true,
        actorUserId: true,
        action: true,
        entityType: true,
        entityId: true,
        metadataJson: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ])

  return { entries, total }
}
