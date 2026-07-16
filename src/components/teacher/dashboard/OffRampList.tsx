import type { OffRampRow } from '@/lib/class-analytics'
import { AlertBadge } from '@/components/teacher/shared/AlertBadge'
import { EmptyState } from '@/components/teacher/shared/EmptyState'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

const OFF_RAMP_EXPLAINER =
  "Students who used 3 mastery attempts plus remediation without passing. Off-ramp isn't failure — it unlocks their next mission and increases how often that benchmark resurfaces in their Daily Drill."

interface OffRampListProps {
  rows: OffRampRow[]
}

export function OffRampList({ rows }: OffRampListProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <ExplainerHover title="Off-Ramp Students" text={OFF_RAMP_EXPLAINER} theme="admin">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Off-Ramp Students</h2>
        </ExplainerHover>
        <EmptyState title="No off-ramp students" body="Students who exhaust mastery attempts and complete remediation will appear here." />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <ExplainerHover title="Off-Ramp Students" text={OFF_RAMP_EXPLAINER} theme="admin">
          <h2 className="text-sm font-semibold text-gray-700">Off-Ramp Students</h2>
        </ExplainerHover>
        <AlertBadge tone="warn">{rows.length}</AlertBadge>
      </div>
      <ul className="space-y-2" role="list">
        {rows.map((row, i) => (
          <li key={i} className="flex items-center justify-between rounded-lg bg-yellow-50 px-3 py-2 text-xs">
            <div>
              <span className="font-medium text-gray-700">{row.displayName}</span>
              <span className="ml-2 font-mono text-yellow-700">{row.benchmarkCode}</span>
            </div>
            <div className="flex items-center gap-2">
              {row.conferenceLogged && (
                <AlertBadge tone="info">Conference logged</AlertBadge>
              )}
              <span className="text-gray-400">
                {new Date(row.triggeredAt).toLocaleDateString()}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
