/**
 * Audit Log — CSV Export (Phase 17)
 *
 * Wraps listAuditLogs to produce a flat CSV of audit entries for admin
 * download (audit §36.18 item 1). Pulls in pages so a full export is not
 * capped at the default 50-row limit.
 */

import { listAuditLogs, type AuditLogFilters } from './list'
import { toCsv, type CsvColumn } from '@/lib/export/csv'

/** Flattened, CSV-friendly shape of an audit entry. */
interface AuditCsvRow {
  id: string
  createdAt: string
  actorUserId: string
  action: string
  entityType: string
  entityId: string
  metadata: string
}

const COLUMNS: CsvColumn<AuditCsvRow>[] = [
  { key: 'createdAt', header: 'Timestamp (UTC)' },
  { key: 'action', header: 'Action' },
  { key: 'entityType', header: 'Entity Type' },
  { key: 'entityId', header: 'Entity ID' },
  { key: 'actorUserId', header: 'Actor User ID' },
  { key: 'metadata', header: 'Metadata' },
  { key: 'id', header: 'Log ID' },
]

/** Max rows pulled for a single export, to bound memory. */
const EXPORT_PAGE_SIZE = 1000
const EXPORT_MAX_ROWS = 50_000

/**
 * Build a CSV string of audit logs matching the given filters.
 * Ignores any limit/offset on the incoming filters and paginates internally.
 */
export async function exportAuditLogsCsv(
  filters: AuditLogFilters = {}
): Promise<string> {
  const rows: AuditCsvRow[] = []
  let offset = 0

  // Drop client-supplied paging — we own it here.
  const { limit: _limit, offset: _offset, ...rest } = filters

  while (rows.length < EXPORT_MAX_ROWS) {
    const { entries } = await listAuditLogs({
      ...rest,
      limit: EXPORT_PAGE_SIZE,
      offset,
    })
    if (entries.length === 0) break

    for (const e of entries) {
      rows.push({
        id: e.id,
        createdAt: e.createdAt.toISOString(),
        actorUserId: e.actorUserId ?? '',
        action: e.action,
        entityType: e.entityType,
        entityId: e.entityId ?? '',
        metadata: e.metadataJson == null ? '' : JSON.stringify(e.metadataJson),
      })
    }

    if (entries.length < EXPORT_PAGE_SIZE) break
    offset += EXPORT_PAGE_SIZE
  }

  return toCsv(rows, COLUMNS)
}
