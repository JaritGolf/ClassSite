/**
 * SessionDetailList — every individual work session, newest first.
 *
 * Server component. This is the "when did they log on, for how long, and what
 * did they get done" view: one block per session, grouped by student.
 *
 * Sessions are collapsed into <details> so a week of a full class does not bury
 * the page; the summary line carries the three headline facts so the teacher
 * rarely needs to expand.
 */

import Link from 'next/link'
import type { SessionRow } from '@/lib/activity-sessions'
import { EmptyState } from '@/components/teacher/shared/EmptyState'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

function formatStart(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '<1m'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

interface StudentSessions {
  studentId: string
  displayName: string
  sessions: SessionRow[]
}

export function SessionDetailList({ students }: { students: StudentSessions[] }) {
  const withSessions = students.filter((s) => s.sessions.length > 0)

  if (withSessions.length === 0) {
    return (
      <EmptyState
        title="No sessions in this range"
        body="Nobody in this class worked on the platform during the selected dates."
      />
    )
  }

  return (
    <div className="space-y-4">
      {withSessions.map((student) => (
        <div
          key={student.studentId}
          className="rounded-lg border border-gray-200 bg-white shadow-sm"
        >
          <div className="flex items-baseline justify-between gap-2 border-b border-gray-100 px-4 py-2">
            <Link
              href={`/teacher/students/${student.studentId}`}
              className="text-sm font-semibold text-indigo-700 hover:underline"
            >
              {student.displayName}
            </Link>
            <span className="text-xs text-gray-500">
              {student.sessions.length}{' '}
              {student.sessions.length === 1 ? 'session' : 'sessions'}
            </span>
          </div>
          <ul className="divide-y divide-gray-100">
            {student.sessions.map((session) => (
              <li key={session.sessionId}>
                <SessionBlock session={session} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function SessionBlock({ session }: { session: SessionRow }) {
  const p = session.progress
  const end = session.endedAt ?? session.lastActiveAt
  const accomplishments: string[] = []
  if (p.questionsAnswered > 0)
    accomplishments.push(`${p.questionsAnswered} questions`)
  if (p.assessmentsSubmitted > 0) {
    const scores =
      p.assessmentScores.length > 0
        ? ` (${p.assessmentScores.map((s) => `${s}%`).join(', ')})`
        : ''
    accomplishments.push(`${p.assessmentsSubmitted} assessments${scores}`)
  }
  if (p.drillReviews > 0) {
    accomplishments.push(
      `${p.drillReviews} drill reviews (${p.drillCorrect} correct)`
    )
  }
  if (p.remediationsCompleted > 0)
    accomplishments.push(`${p.remediationsCompleted} review activities`)
  if (p.badgesEarned > 0) accomplishments.push(`${p.badgesEarned} badges`)

  return (
    <details className="group">
      <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2 text-sm hover:bg-gray-50">
        <span className="font-medium text-gray-900">
          {formatStart(session.startedAt)}
        </span>
        {session.startedByLogin && (
          <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-indigo-700">
            Signed in
          </span>
        )}
        <span className="tabular-nums font-semibold text-gray-800">
          {formatMinutes(session.activeMinutes)} active
        </span>
        <span className="tabular-nums text-xs text-gray-500">
          {formatClock(session.startedAt)}–{formatClock(end)} ·{' '}
          {formatMinutes(session.spanMinutes)} span
        </span>
        {p.benchmarksMastered.length > 0 && (
          <span className="text-xs font-medium text-green-800">
            mastered {p.benchmarksMastered.join(', ')}
          </span>
        )}
      </summary>

      <div className="space-y-2 px-4 pb-3 pt-1 text-xs text-gray-600">
        <div>
          <span className="font-medium text-gray-700">Accomplished: </span>
          {accomplishments.length > 0 ? (
            accomplishments.join(' · ')
          ) : (
            <span className="text-gray-400">
              No graded work recorded — time was spent reading or navigating.
            </span>
          )}
        </div>
        <div>
          <span className="font-medium text-gray-700">Time spent: </span>
          {session.areas.length > 0 ? (
            session.areas.map((a) => `${a.label} ${a.minutes}m`).join(' · ')
          ) : (
            <span className="text-gray-400">Not broken down</span>
          )}
        </div>
      </div>
    </details>
  )
}

/** Column-header helpers reused by the student-profile card. */
export function SessionLegend() {
  return (
    <p className="text-xs text-gray-500">
      <ExplainerHover
        title="Started"
        text="The first activity of a work session — which is when the student logged on if they signed in fresh. Students stay signed in between visits, so this is when they got to work rather than when they clicked a login button."
        theme="admin"
      >
        <span>Started</span>
      </ExplainerHover>
      {' · '}
      <ExplainerHover
        title="Active vs. span"
        text="Active is time actually spent working — it stops counting when the tab is in the background or there has been no clicking, typing, or scrolling for five minutes. Span is the wall clock from first to last activity, so it is always the larger number. A big gap between the two means the student was sitting idle."
        theme="admin"
      >
        <span>active vs. span</span>
      </ExplainerHover>
      {' · '}
      <ExplainerHover
        title="Time spent"
        text="Which parts of the app the minutes went to. Useful for spotting a student who spent a full period on the dashboard without opening a mission."
        theme="admin"
      >
        <span>time spent</span>
      </ExplainerHover>
      {' — hover any term for detail. Expand a session for the full breakdown.'}
    </p>
  )
}
