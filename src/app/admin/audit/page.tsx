/**
 * /admin/audit
 *
 * Audit-log viewer (audit §36.18 item 1). Lists recent AuditLog entries with
 * simple filter controls (action / entityType / since) driven by the URL, plus
 * a "Download CSV" link to /api/admin/audit/export.
 *
 * ADMIN-gated by the admin layout. Server component.
 */

import Link from 'next/link'
import { listAuditLogs } from '@/lib/audit'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

interface AuditPageProps {
  searchParams: {
    action?: string
    entityType?: string
    since?: string
  }
}

const PAGE_SIZE = 100

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const filters = {
    action: searchParams.action || undefined,
    entityType: searchParams.entityType || undefined,
    since: searchParams.since || undefined,
    limit: PAGE_SIZE,
  }

  const { entries, total } = await listAuditLogs(filters)

  // Build the export URL preserving the active (non-PII) filters.
  const exportParams = new URLSearchParams()
  if (filters.action) exportParams.set('action', filters.action)
  if (filters.entityType) exportParams.set('entityType', filters.entityType)
  if (filters.since) exportParams.set('since', filters.since)
  const exportHref = `/api/admin/audit/export${
    exportParams.toString() ? `?${exportParams.toString()}` : ''
  }`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-600 mt-1">
            {total} matching {total === 1 ? 'entry' : 'entries'}
            {entries.length < total ? ` — showing latest ${entries.length}` : ''}
          </p>
        </div>
        <a
          href={exportHref}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Download CSV
        </a>
      </div>

      {/* Filters (GET form — values land in the URL, no PII) */}
      <form method="GET" className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <label className="flex flex-col text-xs font-medium text-gray-600">
          Action
          <input
            type="text"
            name="action"
            defaultValue={searchParams.action ?? ''}
            placeholder="e.g. REPORT_EXPORTED"
            className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col text-xs font-medium text-gray-600">
          Entity Type
          <input
            type="text"
            name="entityType"
            defaultValue={searchParams.entityType ?? ''}
            placeholder="e.g. Student"
            className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col text-xs font-medium text-gray-600">
          Since
          <input
            type="date"
            name="since"
            defaultValue={searchParams.since ?? ''}
            className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Apply
        </button>
        <Link
          href="/admin/audit"
          className="rounded-md px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          Clear
        </Link>
      </form>

      {/* tabIndex: the table can overflow horizontally — keyboard users need to
          be able to focus the scroll region to pan it (axe scrollable-region-focusable). */}
      <div
        className="overflow-x-auto rounded-lg border border-gray-200 bg-white"
        tabIndex={0}
        role="region"
        aria-label="Audit log entries"
      >
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="px-4 py-2">Timestamp (UTC)</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Entity</th>
              <th className="px-4 py-2">
                <ExplainerHover
                  theme="admin"
                  variant="underline"
                  title="Actor"
                  text="The internal user ID of whoever performed this action. A dash means the system did it automatically (no logged-in user)."
                >
                  Actor
                </ExplainerHover>
              </th>
              <th className="px-4 py-2">
                <ExplainerHover
                  theme="admin"
                  variant="underline"
                  title="Metadata"
                  text="Extra details captured for this specific action, shown as raw JSON — e.g. which fields changed or what was exported."
                >
                  Metadata
                </ExplainerHover>
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-600">
                  No audit entries match these filters.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="border-b last:border-0 align-top">
                  <td className="px-4 py-2 whitespace-nowrap font-mono text-xs text-gray-600">
                    {e.createdAt.toISOString().replace('T', ' ').slice(0, 19)}
                  </td>
                  <td className="px-4 py-2 font-medium">{e.action}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {e.entityType}
                    {e.entityId ? (
                      <span className="block font-mono text-xs text-gray-600">{e.entityId}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">
                    {e.actorUserId ?? '—'}
                  </td>
                  <td className="px-4 py-2 max-w-md">
                    <code className="block truncate text-xs text-gray-500">
                      {e.metadataJson ? JSON.stringify(e.metadataJson) : '—'}
                    </code>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
