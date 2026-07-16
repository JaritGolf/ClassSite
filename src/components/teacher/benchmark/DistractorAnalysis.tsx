/**
 * DistractorAnalysis — table of most-selected wrong answers with misconception mapping.
 */

import type { DistractorRow } from '@/lib/benchmark-analytics'
import { EmptyState } from '@/components/teacher/shared/EmptyState'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

const DISTRACTOR_EXPLAINER =
  'The wrong answers students pick most often for this benchmark, linked to a known misconception where one applies — useful for spotting a confusing question versus a real conceptual gap.'

interface Props {
  rows: DistractorRow[]
}

export function DistractorAnalysis({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <ExplainerHover title="Distractor Analysis" text={DISTRACTOR_EXPLAINER} theme="admin">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Distractor Analysis
          </h3>
        </ExplainerHover>
        <EmptyState title="No distractor data" body="No incorrect responses recorded yet." />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Distractor Analysis
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
              <th className="pb-2 pr-4">Wrong Answer Preview</th>
              <th className="pb-2 pr-4 text-right">Times Selected</th>
              <th className="pb-2">Misconception</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row) => (
              <tr key={row.optionId} className="hover:bg-gray-50">
                <td className="py-2 pr-4 text-xs text-gray-600 max-w-xs truncate">
                  {row.optionPreview}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums text-xs text-gray-700">
                  {row.selectedCount}
                </td>
                <td className="py-2 text-xs">
                  {row.misconceptionCode ? (
                    <span>
                      <span className="font-mono text-indigo-700">{row.misconceptionCode}</span>
                      {row.misconceptionLabel && (
                        <span className="ml-1 text-gray-500">— {row.misconceptionLabel}</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
