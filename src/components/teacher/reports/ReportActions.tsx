'use client'

/**
 * ReportActions — client toolbar for the teacher Reports page (Phase 17).
 *
 * CSV exports are plain anchor downloads to the server route (data in the
 * response body, never in the URL). "Export PDF" reuses the browser print
 * dialog (ADR 0008 — no PDF library).
 */

export function ReportActions() {
  return (
    <div className="flex gap-3 print:hidden">
      <a
        href="/api/teacher/reports/export?type=class"
        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Class CSV
      </a>
      <a
        href="/api/teacher/reports/export?type=eoc"
        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        EOC Readiness CSV
      </a>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        Export PDF / Print
      </button>
    </div>
  )
}
