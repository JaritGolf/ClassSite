/**
 * SuggestionFilters — GET filter form for the teacher suggestions tab (ADR 0019).
 *
 * Structurally the same shape as /admin/audit's filter form. Every parameter that
 * lands in the URL is PII-free: enum values, cuids, a route pattern, and a date.
 * Author names and emails are table columns only, never query strings (rule #9 /
 * "no PII in URL parameters").
 */

import Link from 'next/link'
import { SUGGESTION_STATUS_LABELS } from '@/lib/suggestions/status'

interface SuggestionFiltersProps {
  /** Which tab the form submits back to — comments or questions. */
  tab: 'suggestions' | 'questions'
  classes: Array<{ id: string; name: string; period: string | null }>
  status: string
  classId: string
  routePattern: string
  since: string
}

export function SuggestionFilters({
  tab,
  classes,
  status,
  classId,
  routePattern,
  since,
}: SuggestionFiltersProps) {
  return (
    <form
      method="GET"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4"
    >
      {/* Without this the GET form would drop the tab and bounce back to Daily Plan. */}
      <input type="hidden" name="tab" value={tab} />

      <label className="flex flex-col text-xs font-medium text-gray-600">
        Status
        <select
          name="status"
          defaultValue={status}
          className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">Any</option>
          {(Object.keys(SUGGESTION_STATUS_LABELS) as Array<keyof typeof SUGGESTION_STATUS_LABELS>).map(
            (s) => (
              <option key={s} value={s}>
                {SUGGESTION_STATUS_LABELS[s]}
              </option>
            )
          )}
        </select>
      </label>

      <label className="flex flex-col text-xs font-medium text-gray-600">
        Class
        <select
          name="classId"
          defaultValue={classId}
          className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.period ? `${c.name} (${c.period})` : c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col text-xs font-medium text-gray-600">
        Page
        <input
          type="text"
          name="routePattern"
          defaultValue={routePattern}
          placeholder="e.g. /student/mission"
          className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
      </label>

      <label className="flex flex-col text-xs font-medium text-gray-600">
        Since
        <input
          type="date"
          name="since"
          defaultValue={since}
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
        href={`/teacher/reports?tab=${tab}`}
        className="rounded-md px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        Clear
      </Link>
    </form>
  )
}
