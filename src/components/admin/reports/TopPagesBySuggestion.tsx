/**
 * TopPagesBySuggestion — "which pages confuse people" (ADR 0019).
 *
 * The aggregate that makes the whole feature worth having: suggestions grouped by
 * the route they were filed from. Rule #9 rules out third-party analytics, so this
 * is the only signal of its kind in the app.
 *
 * `routePattern` is the parameterized route (/student/mission/[benchmarkCode]), not
 * a concrete path, so rows group across students and carry no PII — which is also
 * why it's safe to put in the filter link.
 */

import Link from 'next/link'

interface TopPagesBySuggestionProps {
  rows: Array<{ routePattern: string; pageLabel: string; count: number }>
  /** Builds the table-filter href for a row, preserving other active filters. */
  hrefFor: (routePattern: string) => string
}

export function TopPagesBySuggestion({ rows, hrefFor }: TopPagesBySuggestionProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
        No suggestions yet — nothing to rank.
      </div>
    )
  }

  const max = Math.max(...rows.map((r) => r.count))

  return (
    <ol className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
      {rows.map((row) => (
        <li key={row.routePattern} className="flex items-center gap-3 px-4 py-2">
          <Link
            href={hrefFor(row.routePattern)}
            className="min-w-0 flex-1 text-sm text-indigo-700 hover:underline"
          >
            <span className="font-medium">{row.pageLabel}</span>
            <span className="block truncate font-mono text-xs text-gray-500">
              {row.routePattern}
            </span>
          </Link>
          {/* Bar is decorative; the count beside it carries the same information
              in text, so this is never colour- or width-only. */}
          <div className="hidden h-2 w-32 overflow-hidden rounded-full bg-gray-100 sm:block" aria-hidden="true">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{ width: `${Math.round((row.count / max) * 100)}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-sm font-semibold text-gray-900">
            {row.count}
          </span>
        </li>
      ))}
    </ol>
  )
}
