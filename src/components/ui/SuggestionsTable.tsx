/**
 * SuggestionsTable — the shared read surface for suggestions (ADR 0019).
 *
 * Server component, used by BOTH /teacher/reports?tab=suggestions and
 * /admin/reports. The admin view differs only by two extra columns, so this is one
 * component with flags rather than two files that would drift.
 *
 * SAFETY: the body renders as `{item.body}` inside `whitespace-pre-wrap` — React
 * escapes it and the newlines the textarea produced are preserved with no parsing.
 * There is no `dangerouslySetInnerHTML` anywhere in this feature, by design.
 */

import type { SuggestionListItem } from '@/lib/suggestions'
import { SUGGESTION_KIND_LABELS } from '@/lib/suggestions/constants'
import { SUGGESTION_STATUS_LABELS, SUGGESTION_STATUS_TRANSITIONS } from '@/lib/suggestions/status'
import { ExplainerHover } from '@/components/ui/ExplainerHover'
import { SuggestionStatusControl } from '@/components/ui/SuggestionStatusControl'

interface SuggestionsTableProps {
  items: SuggestionListItem[]
  /** Show the "Teacher in the loop" column (admin view). */
  showTeacher?: boolean
  /** Show the author's role (admin view, where authors are mixed). */
  showAuthorRole?: boolean
  /**
   * Show a Comment / Question column. Off on the teacher tabs, which are already
   * split by kind — the column would repeat the tab you're standing on.
   */
  showKind?: boolean
  /** Heading for the body column — "Question" on the questions tab. */
  bodyColumnLabel?: string
  emptyMessage?: string
}

const STATUS_PILL: Record<string, string> = {
  NEW: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  IN_REVIEW: 'bg-amber-50 text-amber-800 border-amber-200',
  RESOLVED: 'bg-green-50 text-green-800 border-green-200',
  DISMISSED: 'bg-gray-100 text-gray-600 border-gray-300',
}

export function SuggestionsTable({
  items,
  showTeacher = false,
  showAuthorRole = false,
  showKind = false,
  bodyColumnLabel = 'Suggestion',
  emptyMessage = 'No suggestions match these filters.',
}: SuggestionsTableProps) {
  const columnCount = 5 + (showTeacher ? 1 : 0) + (showKind ? 1 : 0)

  return (
    // tabIndex: this table overflows horizontally on narrow viewports, and keyboard
    // users need to be able to focus the scroll region to pan it
    // (axe scrollable-region-focusable) — same treatment as /admin/audit.
    <div
      className="overflow-x-auto rounded-lg border border-gray-200 bg-white"
      tabIndex={0}
      role="region"
      aria-label="Suggestions"
    >
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="px-4 py-2">Received</th>
            {showKind && <th className="px-4 py-2">Type</th>}
            <th className="px-4 py-2">From</th>
            {showTeacher && <th className="px-4 py-2">Teacher</th>}
            <th className="px-4 py-2">
              <ExplainerHover
                theme="admin"
                variant="underline"
                title="Page"
                text="The page the author was on when they wrote this. Captured automatically — it's the fastest way to see which parts of the site confuse people."
              >
                Page
              </ExplainerHover>
            </th>
            <th className="px-4 py-2">{bodyColumnLabel}</th>
            <th className="px-4 py-2">
              <ExplainerHover
                theme="admin"
                variant="underline"
                title="Status"
                text="New until someone picks it up. Move it to In review while you're working on it, then Resolved or Dismissed. Resolved and Dismissed items can be reopened back into In review."
              >
                Status
              </ExplainerHover>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={columnCount} className="px-4 py-8 text-center text-gray-600">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} className="border-b align-top last:border-0">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600">
                  {item.createdAt.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                  <span className="block text-gray-500">
                    {item.createdAt.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </td>

                {showKind && (
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${
                        item.kind === 'QUESTION'
                          ? 'border-sky-200 bg-sky-50 text-sky-800'
                          : 'border-gray-300 bg-gray-100 text-gray-700'
                      }`}
                    >
                      {SUGGESTION_KIND_LABELS[item.kind]}
                    </span>
                  </td>
                )}

                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900">{item.author.displayName}</span>
                  {showAuthorRole && (
                    <span className="block text-xs uppercase tracking-wide text-gray-500">
                      {item.author.role}
                    </span>
                  )}
                  {item.className && (
                    <span className="block text-xs text-gray-600">{item.className}</span>
                  )}
                </td>

                {showTeacher && (
                  <td className="px-4 py-3 text-xs text-gray-600">{item.teacherName ?? '—'}</td>
                )}

                <td className="px-4 py-3">
                  <span className="text-gray-900">{item.pageLabel}</span>
                  <span className="block font-mono text-xs text-gray-500">{item.pathname}</span>
                </td>

                <td className="max-w-md px-4 py-3">
                  <p className="whitespace-pre-wrap text-gray-800">{item.body}</p>
                  {item.reviewerNote && (
                    <p className="mt-1 border-l-2 border-gray-300 pl-2 text-xs italic text-gray-600">
                      Note: {item.reviewerNote}
                    </p>
                  )}
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`mb-1 inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${
                      STATUS_PILL[item.status] ?? STATUS_PILL.DISMISSED
                    }`}
                  >
                    {SUGGESTION_STATUS_LABELS[item.status]}
                  </span>
                  <SuggestionStatusControl
                    suggestionId={item.id}
                    status={item.status}
                    allowed={SUGGESTION_STATUS_TRANSITIONS[item.status]}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
