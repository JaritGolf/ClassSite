/**
 * /admin/reports — the admin suggestion queue (ADR 0019).
 *
 * Teacher- and admin-authored suggestions filed from the nav-bar suggestion box.
 * Modeled on /admin/audit: server component, URL-driven filters, focusable table
 * region. ADMIN-gated by the admin layout, and `listSuggestionsForAdmin` re-checks
 * the role itself so the authorization doesn't depend on the layout alone.
 *
 * Student-authored suggestions are OFF by default behind an explicit checkbox
 * (owner's decision). ADMIN is already a super-role here — it reads every roster
 * and every audit row — so hiding them would be a false boundary; but defaulting
 * them on would bury the teacher-authored signal an admin actually needs.
 */

import Link from 'next/link'
import type { SuggestionKind, SuggestionStatus } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { listSuggestionsForAdmin } from '@/lib/suggestions'
import { SUGGESTION_KIND_LABELS } from '@/lib/suggestions/constants'
import { SUGGESTION_STATUS_LABELS } from '@/lib/suggestions/status'
import { ExplainerHover } from '@/components/ui/ExplainerHover'
import { SuggestionsTable } from '@/components/ui/SuggestionsTable'
import { TopPagesBySuggestion } from '@/components/admin/reports/TopPagesBySuggestion'

const STATUS_VALUES: SuggestionStatus[] = ['NEW', 'IN_REVIEW', 'RESOLVED', 'DISMISSED']
const KIND_VALUES: SuggestionKind[] = ['COMMENT', 'QUESTION']

interface AdminReportsPageProps {
  searchParams: {
    status?: string
    kind?: string
    routePattern?: string
    since?: string
    includeStudents?: string
  }
}

export default async function AdminReportsPage({ searchParams }: AdminReportsPageProps) {
  const session = await getSession()
  // The admin layout already gates this route; this is belt-and-suspenders so the
  // page can't be rendered without a session by some future refactor.
  if (!session) return null

  const status = STATUS_VALUES.find((s) => s === searchParams.status)
  const kind = KIND_VALUES.find((k) => k === searchParams.kind)
  const parsedSince = searchParams.since ? new Date(searchParams.since) : undefined
  const since = parsedSince && !Number.isNaN(parsedSince.getTime()) ? parsedSince : undefined
  const includeStudents = searchParams.includeStudents === '1'

  const result = await listSuggestionsForAdmin(session.user.userId, {
    status,
    kind,
    routePattern: searchParams.routePattern || undefined,
    since,
    includeStudentAudience: includeStudents,
  })

  const { countsByStatus, topRoutes, total, items } = result

  /** Preserve the active filters when a Top Pages row links into the table. */
  function hrefWithRoute(routePattern: string): string {
    const params = new URLSearchParams()
    params.set('routePattern', routePattern)
    if (searchParams.status) params.set('status', searchParams.status)
    if (searchParams.kind) params.set('kind', searchParams.kind)
    if (searchParams.since) params.set('since', searchParams.since)
    if (includeStudents) params.set('includeStudents', '1')
    return `/admin/reports?${params.toString()}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports — Suggestions</h1>
        <p className="mt-1 text-sm text-gray-600">
          {total} matching {total === 1 ? 'suggestion' : 'suggestions'}
          {items.length < total ? ` — showing latest ${items.length}` : ''} ·{' '}
          {countsByStatus.NEW} new ·{' '}
          {includeStudents ? 'teachers and students' : 'teachers only'}
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">
          <ExplainerHover
            theme="admin"
            variant="underline"
            title="Pages drawing the most suggestions"
            text="Ranked by how many suggestions were filed from each page. This is the fastest read on which parts of the site are confusing people — the page is captured automatically when someone writes a suggestion."
          >
            Pages drawing the most suggestions
          </ExplainerHover>
        </h2>
        <TopPagesBySuggestion rows={topRoutes} hrefFor={hrefWithRoute} />
      </section>

      {/* Filters (GET form — every value that lands in the URL is PII-free) */}
      <form
        method="GET"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4"
      >
        <label className="flex flex-col text-xs font-medium text-gray-600">
          Status
          <select
            name="status"
            defaultValue={searchParams.status ?? ''}
            className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">Any</option>
            {STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {SUGGESTION_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-xs font-medium text-gray-600">
          Type
          <select
            name="kind"
            defaultValue={searchParams.kind ?? ''}
            className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">Any</option>
            {KIND_VALUES.map((k) => (
              <option key={k} value={k}>
                {SUGGESTION_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-xs font-medium text-gray-600">
          Page
          <input
            type="text"
            name="routePattern"
            defaultValue={searchParams.routePattern ?? ''}
            placeholder="e.g. /teacher/dashboard"
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

        <label className="flex items-center gap-2 pb-1.5 text-xs font-medium text-gray-600">
          <input
            type="checkbox"
            name="includeStudents"
            value="1"
            defaultChecked={includeStudents}
            className="h-4 w-4 rounded border-gray-300"
          />
          <ExplainerHover
            theme="admin"
            variant="underline"
            title="Include student suggestions"
            text="Off by default so teacher-authored feedback isn't buried by student volume. Turning it on shows student suggestions across every teacher's classes — useful for spotting a page that confuses students site-wide."
          >
            Include student suggestions (all teachers)
          </ExplainerHover>
        </label>

        <button
          type="submit"
          className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Apply
        </button>
        <Link
          href="/admin/reports"
          className="rounded-md px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          Clear
        </Link>
      </form>

      <SuggestionsTable
        items={items}
        showTeacher
        showAuthorRole
        showKind
        emptyMessage="No suggestions match these filters."
      />
    </div>
  )
}
