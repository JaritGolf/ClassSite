/**
 * DailyRosterTable — per-student status grid for one class.
 *
 * Server component. Shows each student's current mission, benchmarks mastered,
 * spaced-review items due today, and any attention flags. Flagged students
 * are sorted to the top by the builder.
 */

import Link from 'next/link'
import type { DailyStudentRow, DailyFlag } from '@/lib/daily-report'

const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  READY_FOR_MASTERY: 'Ready for mastery',
  NEEDS_REMEDIATION: 'Needs remediation',
  REMEDIATION_COMPLETE: 'Remediation complete',
  MASTERED: 'Mastered',
  EXPOSURE_COMPLETE: 'Exposure complete',
  TEACHER_OVERRIDE: 'Teacher override',
  INTERVENTION_REQUIRED: 'Intervention required',
}

const FLAG_META: Record<DailyFlag, { label: string; className: string }> = {
  OFF_RAMP: { label: 'Off-ramp', className: 'bg-red-50 text-red-800 border-red-200' },
  INTERVENTION: { label: 'Intervention', className: 'bg-red-50 text-red-800 border-red-200' },
  DECAY: { label: 'Decay', className: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
  REMEDIATION_OVERDUE: { label: 'Remediation overdue', className: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
  OVERCONFIDENCE: { label: 'Overconfidence', className: 'bg-blue-50 text-blue-800 border-blue-200' },
  DRILL_DUE: { label: 'Drill due', className: 'bg-blue-50 text-blue-800 border-blue-200' },
}

function FlagPill({ flag }: { flag: DailyFlag }) {
  const meta = FLAG_META[flag]
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${meta.className}`}
    >
      {meta.label}
    </span>
  )
}

export function DailyRosterTable({ roster }: { roster: DailyStudentRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left text-gray-500">
            <th className="px-4 py-2 font-medium">Student</th>
            <th className="px-4 py-2 font-medium">Current mission</th>
            <th className="px-4 py-2 text-right font-medium">Mastered</th>
            <th className="px-4 py-2 text-right font-medium">Due today</th>
            <th className="px-4 py-2 font-medium">Flags</th>
          </tr>
        </thead>
        <tbody>
          {roster.map((r) => (
            <tr key={r.studentId} className="border-b last:border-0 align-top">
              <td className="px-4 py-2">
                <Link
                  href={`/teacher/students/${r.studentId}`}
                  className="font-medium text-indigo-700 hover:underline"
                >
                  {r.displayName}
                </Link>
                {(r.ellStatus || r.eseStatus) && (
                  <div className="mt-0.5 flex gap-1">
                    {r.ellStatus && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-500">
                        ELL
                      </span>
                    )}
                    {r.eseStatus && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-500">
                        ESE
                      </span>
                    )}
                  </div>
                )}
              </td>
              <td className="px-4 py-2">
                {r.currentMission ? (
                  <div>
                    <span className="font-mono text-xs text-gray-500">
                      {r.currentMission.benchmarkCode}
                    </span>
                    <div className="text-gray-700">{r.currentMission.title}</div>
                    <div className="text-xs text-gray-500">
                      {STATUS_LABELS[r.currentMission.status] ?? r.currentMission.status}
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="px-4 py-2 text-right tabular-nums">{r.masteredCount}</td>
              <td className="px-4 py-2 text-right tabular-nums">
                {r.itemsDueToday > 0 ? (
                  r.itemsDueToday
                ) : (
                  <span className="text-gray-400">0</span>
                )}
              </td>
              <td className="px-4 py-2">
                {r.flags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {r.flags.map((f) => (
                      <FlagPill key={f} flag={f} />
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">On track</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
