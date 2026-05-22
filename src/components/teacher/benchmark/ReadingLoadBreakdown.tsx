/**
 * ReadingLoadBreakdown — bar chart of correct rate by reading-load level.
 */

import type { DimensionBreakdown } from '@/lib/benchmark-analytics'
import { BarRow } from '@/components/teacher/shared/BarRow'
import { EmptyState } from '@/components/teacher/shared/EmptyState'

const LEVEL_LABELS: Record<string, string> = {
  '1': 'Level 1 (Paraphrase)',
  '2': 'Level 2 (EOC-equiv)',
  '3': 'Level 3 (Raw passage)',
}

interface Props {
  data: DimensionBreakdown<'1' | '2' | '3'>
}

export function ReadingLoadBreakdown({ data }: Props) {
  const hasData = data.rows.some((r) => r.sampleSize > 0)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
        By Reading-Load Level
      </h3>
      {!hasData ? (
        <EmptyState title="No data" body="No responses for this benchmark yet." />
      ) : (
        <div className="space-y-3">
          {data.rows.map((row) => (
            <BarRow
              key={row.key}
              label={LEVEL_LABELS[row.key] ?? `Level ${row.key}`}
              correctRate={row.correctRate}
              sampleSize={row.sampleSize}
            />
          ))}
        </div>
      )}
    </div>
  )
}
