/**
 * ComplexityBreakdown — bar chart of correct rate by cognitive complexity.
 */

import type { DimensionBreakdown } from '@/lib/benchmark-analytics'
import { BarRow } from '@/components/teacher/shared/BarRow'
import { EmptyState } from '@/components/teacher/shared/EmptyState'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

interface Props {
  data: DimensionBreakdown<'LOW' | 'MODERATE' | 'HIGH'>
}

export function ComplexityBreakdown({ data }: Props) {
  const hasData = data.rows.some((r) => r.sampleSize > 0)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <ExplainerHover
        title="Cognitive Complexity"
        text="Correct rate broken down by how demanding the question's thinking is: Low (recall), Moderate (apply/compare), High (analyze/evaluate). A big drop at High complexity means students know the facts but struggle to reason with them."
        theme="admin"
      >
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          By Cognitive Complexity
        </h3>
      </ExplainerHover>
      {!hasData ? (
        <EmptyState title="No data" body="No responses for this benchmark yet." />
      ) : (
        <div className="space-y-3">
          {data.rows.map((row) => (
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
