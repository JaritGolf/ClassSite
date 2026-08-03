/**
 * SessionActivityTable — per-student activity rollup for the selected range.
 *
 * Server component. One row per student; students with no activity are kept
 * visible (rather than filtered out) because "nobody logged on" is exactly the
 * thing a teacher needs to see.
 */

import Link from 'next/link'
import type { StudentActivitySummary } from '@/lib/activity-sessions'
import { EmptyState } from '@/components/teacher/shared/EmptyState'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '—'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

function formatLastActive(date: Date | null): string {
  if (!date) return 'Never'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function SessionActivityTable({
  summaries,
}: {
  summaries: StudentActivitySummary[]
}) {
  if (summaries.length === 0) {
    return (
      <EmptyState
        title="No students in this class"
        body="Enroll students to see their session activity."
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left text-gray-500">
            <th className="px-4 py-2 font-medium">Student</th>
            <th className="px-4 py-2 text-right font-medium">
              <ExplainerHover
                title="Sessions"
                text="How many separate stretches of work this student put in during the range. A new session starts whenever they come back after being away for 15 minutes or more."
                theme="admin"
              >
                <span>Sessions</span>
              </ExplainerHover>
            </th>
            <th className="px-4 py-2 text-right font-medium">
              <ExplainerHover
                title="Active time"
                text="Total minutes actually spent working. Time with the tab in the background, or with no clicking, typing, or scrolling for five minutes, is not counted — so a browser left open over lunch does not inflate this."
                theme="admin"
              >
                <span>Active time</span>
              </ExplainerHover>
            </th>
            <th className="px-4 py-2 text-right font-medium">Longest</th>
            <th className="px-4 py-2 font-medium">
              <ExplainerHover
                title="Last active"
                text="The most recent moment this student did anything on the platform within the selected range."
                theme="admin"
              >
                <span>Last active</span>
              </ExplainerHover>
            </th>
            <th className="px-4 py-2 font-medium">
              <ExplainerHover
                title="Work completed"
                text="What the student got done during their sessions in this range: questions answered, assessments submitted, benchmarks mastered, and daily-drill reviews cleared."
                theme="admin"
              >
                <span>Work completed</span>
              </ExplainerHover>
            </th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((s) => {
            const p = s.progress
            const noActivity = s.sessionCount === 0
            return (
              <tr
                key={s.studentId}
                className={`border-b last:border-0 align-top ${noActivity ? 'bg-gray-50/60' : ''}`}
              >
                <td className="px-4 py-2">
                  <Link
                    href={`/teacher/students/${s.studentId}`}
                    className="font-medium text-indigo-700 hover:underline"
                  >
                    {s.displayName}
                  </Link>
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {noActivity ? (
                    <span className="text-gray-400">0</span>
                  ) : (
                    s.sessionCount
                  )}
                </td>
                <td className="px-4 py-2 text-right tabular-nums font-medium">
                  {formatMinutes(s.totalActiveMinutes)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                  {formatMinutes(s.longestSessionMinutes)}
                </td>
                <td className="px-4 py-2 text-gray-600">
                  {noActivity ? (
                    <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-500">
                      No activity
                    </span>
                  ) : (
                    formatLastActive(s.lastActiveAt)
                  )}
                </td>
                <td className="px-4 py-2 text-gray-700">
                  {noActivity ? (
                    <span className="text-gray-400">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                      <span>{p.questionsAnswered} questions</span>
                      {p.assessmentsSubmitted > 0 && (
                        <span>{p.assessmentsSubmitted} assessments</span>
                      )}
                      {p.benchmarksMastered.length > 0 && (
                        <span className="font-medium text-green-800">
                          {p.benchmarksMastered.length} mastered
                        </span>
                      )}
                      {p.drillReviews > 0 && <span>{p.drillReviews} drill</span>}
                      {p.remediationsCompleted > 0 && (
                        <span>{p.remediationsCompleted} review done</span>
                      )}
                      {p.badgesEarned > 0 && <span>{p.badgesEarned} badges</span>}
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
