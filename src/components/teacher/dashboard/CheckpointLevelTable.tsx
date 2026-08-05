import Link from 'next/link'
import { EmptyState } from '@/components/teacher/shared/EmptyState'
import { ExplainerHover } from '@/components/ui/ExplainerHover'
import type { ClassCheckpointLevels } from '@/lib/class-analytics'

interface CheckpointLevelTableProps {
  tables: ClassCheckpointLevels[]
}

/**
 * Per-student Level for the nine-week checkpoint currently in play, one table per
 * class (classes can be on different plans).
 *
 * "Behind" is amber, never red — consistent with StrategyCompletionTable and the
 * project's stance that falling behind is a signal to act on, not a punishment to
 * display. Rows are ordered lowest-level-first so the students who need attention
 * are at the top; this is a private teacher view, not a ranking.
 */
export function CheckpointLevelTable({ tables }: CheckpointLevelTableProps) {
  if (tables.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700">Nine-Week Levels</h2>
        <p className="mb-3 text-xs text-gray-500">
          No nine-week targets set yet. Open a class from{' '}
          <Link href="/teacher/classes" className="text-indigo-600 hover:underline">
            Classes
          </Link>{' '}
          and choose &quot;Nine-week targets&quot; to set dates and target missions.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {tables.map((table) => (
        <div key={table.classId} className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-700">
            <ExplainerHover
              theme="admin"
              title="Nine-Week Levels"
              text={
                'How far each student has reached along the targets you set for this nine weeks. ' +
                'Once the end date passes the Level is locked so the number does not shift after ' +
                'you have recorded it. Students see only their own Level.'
              }
            >
              <span>Nine-Week Levels</span>
            </ExplainerHover>
          </h2>
          <a
            href={`/api/teacher/classes/${table.classId}/progress-levels/export`}
            className="float-right text-xs text-indigo-600 hover:underline"
          >
            Download CSV
          </a>
          <p className="mb-3 text-xs text-gray-500">
            {table.className}
            {table.period ? ` (Period ${table.period})` : ''} · Quarter {table.checkpointNumber} ·
            ends{' '}
            {table.endsOn.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              timeZone: 'UTC',
            })}
            {table.isClosed ? ' · closed, Levels locked' : ' · in progress'}
          </p>

          {table.rows.length === 0 ? (
            <EmptyState
              title="No students enrolled"
              body="Enrolled students will appear here with their current Level."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-2 text-left font-medium text-gray-400">Student</th>
                    <th className="pb-2 text-right font-medium text-gray-400">Missions cleared</th>
                    <th className="pb-2 text-right font-medium text-gray-400">Level</th>
                    <th className="pb-2 text-right font-medium text-gray-400">To next level</th>
                    <th className="pb-2 text-left font-medium text-gray-400">Since closing</th>
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((r) => (
                    <tr key={r.studentId} className="border-b border-gray-50">
                      <td className="py-2 pr-2">
                        <Link
                          href={`/teacher/students/${r.studentId}`}
                          className="hover:text-indigo-600 hover:underline"
                        >
                          {r.displayName}
                        </Link>
                      </td>
                      <td className="py-2 pr-2 text-right">{r.missionsCleared}</td>
                      <td
                        className={`py-2 pr-2 text-right font-semibold ${
                          r.maxLevel > 0 && r.level >= r.maxLevel
                            ? 'text-green-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {r.level} / {r.maxLevel}
                      </td>
                      <td className="py-2 pr-2 text-right">
                        {r.nextLevel === null || r.missionsToNextLevel === null
                          ? '—'
                          : `${r.missionsToNextLevel} to L${r.nextLevel}`}
                      </td>
                      <td className="py-2 pr-2">
                        {r.caughtUpLevel === null ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <span className="text-indigo-700">
                            has since reached Level {r.caughtUpLevel}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
