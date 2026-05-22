/**
 * Teacher — Interventions page.
 *
 * Composite view combining students needing action, recommended small groups,
 * and off-ramp students with Appendix-D-style suggested-action text.
 * Server component.
 */

import { requireAuth } from '@/lib/auth'
import {
  getStudentsNeedingAction,
  getRecommendedSmallGroups,
  getOffRampStudents,
} from '@/lib/class-analytics'
import { EmptyState } from '@/components/teacher/shared/EmptyState'
import { AlertBadge } from '@/components/teacher/shared/AlertBadge'
import Link from 'next/link'
import type { NeedingActionRow, SmallGroup, OffRampRow } from '@/lib/class-analytics'

// Appendix-D-style suggested actions per reason
const SUGGESTED_ACTIONS: Record<NeedingActionRow['reason'], string> = {
  OFF_RAMP:
    'Schedule a 1:1 conference to review the off-ramp benchmark. Consider additional scaffolding or tiered assignments.',
  DECAY_SPIKE:
    'Trigger a re-prime session or assign a targeted spaced-review drill for the decaying benchmark.',
  REMEDIATION_OVERDUE:
    'Check in with the student on their assigned remediation. Consider breaking the task into smaller steps.',
  OVERCONFIDENCE:
    'Use metacognitive prompts: ask the student to explain their reasoning before revealing the answer.',
}

export default async function InterventionsPage() {
  const session = await requireAuth(['TEACHER'])
  const userId = session.user.userId

  const [needingAction, smallGroups, offRampStudents] = await Promise.all([
    getStudentsNeedingAction(userId),
    getRecommendedSmallGroups(userId),
    getOffRampStudents(userId),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Interventions</h1>
        <p className="text-sm text-gray-500 mt-1">
          Students who need teacher attention, recommended small groups, and off-ramp students.
        </p>
      </div>

      {/* Students needing action */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3">
          Students Needing Action
          {needingAction.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-500">
              ({needingAction.length})
            </span>
          )}
        </h2>
        {needingAction.length === 0 ? (
          <EmptyState
            title="No interventions needed"
            body="All students are on track. Check back after the next assessment cycle."
          />
        ) : (
          <div className="space-y-3">
            {needingAction.map((row, i) => (
              <div
                key={`${row.studentId}-${row.reason}-${i}`}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/teacher/students/${row.studentId}`}
                        className="font-medium text-gray-900 hover:text-indigo-600"
                      >
                        {row.displayName}
                      </Link>
                      <AlertBadge
                        tone={
                          row.reason === 'OFF_RAMP' || row.reason === 'DECAY_SPIKE'
                            ? 'critical'
                            : 'warn'
                        }
                      >
                        {row.reason.replace(/_/g, ' ')}
                      </AlertBadge>
                      {row.benchmarkCode && (
                        <span className="font-mono text-xs text-gray-500">
                          {row.benchmarkCode}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{SUGGESTED_ACTIONS[row.reason]}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recommended Small Groups */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3">
          Recommended Small Groups
          {smallGroups.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-500">
              ({smallGroups.length})
            </span>
          )}
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Students sharing the same top misconceptions on an active benchmark. Groups of 2–5.
        </p>
        {smallGroups.length === 0 ? (
          <EmptyState
            title="No small groups recommended"
            body="Groups form when 2+ students share the same top misconceptions on an active benchmark."
          />
        ) : (
          <div className="space-y-3">
            {smallGroups.map((group) => (
              <SmallGroupCard key={group.groupId} group={group} />
            ))}
          </div>
        )}
      </section>

      {/* Off-Ramp Students */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3">
          Off-Ramp Students
          {offRampStudents.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-500">
              ({offRampStudents.length})
            </span>
          )}
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Students who triggered the off-ramp (3 failed mastery attempts + remediation + 7 days).
          Off-ramp is not failure — it unlocks the next benchmark and increases spaced review.
        </p>
        {offRampStudents.length === 0 ? (
          <EmptyState
            title="No off-ramp students"
            body="No students have triggered the off-ramp condition."
          />
        ) : (
          <OffRampTable rows={offRampStudents} />
        )}
      </section>
    </div>
  )
}

function SmallGroupCard({ group }: { group: SmallGroup }) {
  return (
    <div className="rounded-xl border border-indigo-100 bg-white p-4">
      <div className="flex items-center justify-between gap-4 mb-2">
        <span className="font-mono text-xs font-semibold text-indigo-700">
          {group.benchmarkCode}
        </span>
        <span className="text-xs text-gray-500">
          {group.studentIds.length} students
        </span>
      </div>
      <div className="flex flex-wrap gap-1 mb-2">
        {group.misconceptionCodes.map((code) => (
          <span
            key={code}
            className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-mono text-indigo-700"
          >
            {code}
          </span>
        ))}
      </div>
      <p className="text-xs text-gray-500">{group.suggestedAction}</p>
    </div>
  )
}

function OffRampTable({ rows }: { rows: OffRampRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
            <th className="px-4 py-3">Student</th>
            <th className="px-4 py-3">Benchmark</th>
            <th className="px-4 py-3">Triggered</th>
            <th className="px-4 py-3">Conference</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row) => (
            <tr key={`${row.studentId}-${row.benchmarkCode}`} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <Link
                  href={`/teacher/students/${row.studentId}`}
                  className="font-medium text-gray-900 hover:text-indigo-600"
                >
                  {row.displayName}
                </Link>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-gray-700">
                {row.benchmarkCode}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {row.triggeredAt.toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                {row.conferenceLogged ? (
                  <AlertBadge tone="info">Logged</AlertBadge>
                ) : (
                  <AlertBadge tone="warn">Pending</AlertBadge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
