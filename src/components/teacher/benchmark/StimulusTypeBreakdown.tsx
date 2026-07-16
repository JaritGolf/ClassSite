/**
 * StimulusTypeBreakdown — bar chart of correct rate by stimulus type.
 */

import type { DimensionBreakdown } from '@/lib/benchmark-analytics'
import { BarRow } from '@/components/teacher/shared/BarRow'
import { EmptyState } from '@/components/teacher/shared/EmptyState'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

interface Props {
  data: DimensionBreakdown<string>
}

export function StimulusTypeBreakdown({ data }: Props) {
  const hasData = data.rows.some((r) => r.sampleSize > 0)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <ExplainerHover
        title="Stimulus Type"
        text="Correct rate broken down by the kind of source material the question was paired with (excerpt, chart, map, etc.) — helps spot whether a specific source format is tripping students up."
        theme="admin"
      >
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          By Stimulus Type
        </h3>
      </ExplainerHover>
      {!hasData ? (
        <EmptyState title="No data" body="No responses for this benchmark yet." />
      ) : (
        <div className="space-y-3">
          {data.rows
            .sort((a, b) => b.sampleSize - a.sampleSize)
            .map((row) => (
              <BarRow
                key={row.key}
                label={row.key}
                correctRate={row.correctRate}
                sampleSize={row.sampleSize}
              />
            ))}
        </div>
      )}
    </div>
  )
}
