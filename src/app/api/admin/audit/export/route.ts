/**
 * GET /api/admin/audit/export
 *
 * Download the audit log as CSV (audit §36.18 item 1).
 *
 * Access: ADMIN only.
 * Filters (all optional, non-PII): action, entityType, entityId, since.
 * The export itself is a sensitive action and is recorded in the audit log.
 */

import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { exportAuditLogsCsv } from '@/lib/audit'
import { csvResponse } from '@/lib/export'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const filters = {
    action: searchParams.get('action') ?? undefined,
    entityType: searchParams.get('entityType') ?? undefined,
    entityId: searchParams.get('entityId') ?? undefined,
    since: searchParams.get('since') ?? undefined,
  }

  const csv = await exportAuditLogsCsv(filters)

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.userId,
      action: 'AUDIT_LOG_EXPORTED',
      entityType: 'AuditLog',
      entityId: null,
      metadataJson: { filters },
    },
  })

  const stamp = new Date().toISOString().slice(0, 10)
  return csvResponse(`audit-log-${stamp}.csv`, csv)
}
