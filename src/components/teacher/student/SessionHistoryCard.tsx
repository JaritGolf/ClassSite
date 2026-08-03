/**
 * SessionHistoryCard — this student's recent work sessions.
 *
 * Server component on the teacher's student-profile page. Same session blocks
 * the class Activity tab uses, scoped to one student.
 */

import type { SessionRow } from '@/lib/activity-sessions'
import { EmptyState } from '@/components/teacher/shared/EmptyState'
import { ExplainerHover } from '@/components/ui/ExplainerHover'
import { SessionBlock } from '@/components/teacher/reports/SessionDetailList'

export function SessionHistoryCard({ sessions }: { sessions: SessionRow[] }) {
  const totalActive = sessions.reduce((sum, s) => sum + s.activeMinutes, 0)

  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <h2 className="text-lg font-semibold text-gray-900">
          <ExplainerHover
            title="Work Sessions"
            text="Each stretch of time this student spent on the platform: when they started, how long they were actually working, and what they got done. A new session starts whenever they return after 15 minutes or more away."
            theme="admin"
          >
            <span>Work Sessions</span>
          </ExplainerHover>
        </h2>
        <span className="text-xs text-gray-500">
          {sessions.length === 0
            ? 'last 30 days'
            : `${sessions.length} in the last 30 days · ${totalActive}m active`}
        </span>
      </div>

      {sessions.length === 0 ? (
        <div className="p-4">
          <EmptyState
            title="No recorded sessions"
            body="This student has not been on the platform in the last 30 days."
          />
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {sessions.map((session) => (
            <li key={session.sessionId}>
              <SessionBlock session={session} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
