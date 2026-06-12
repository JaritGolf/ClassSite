/**
 * ActiveWeightsPanel
 *
 * Shows which reporting-category blueprint weights readiness scoring is CURRENTLY
 * using — either the admin-approved calibration run (the loop is closed) or the
 * default blueprint baseline (year one / no approved run yet).
 *
 * Phase 13: makes the calibration loop closure visible to admins.
 */

import type { ActiveWeightSource } from '@/lib/eoc-analytics'

function formatPercent(weight: number): string {
  return `${(weight * 100).toFixed(1)}%`
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function ActiveWeightsPanel({ source }: { source: ActiveWeightSource }) {
  const isCalibrated = source.source === 'calibrated'
  const entries = Object.entries(source.weights).sort((a, b) => b[1] - a[1])

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold text-gray-900">Active Readiness Weights</h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            isCalibrated
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          <span aria-hidden="true">{isCalibrated ? '✓' : '○'}</span>
          {isCalibrated ? 'Calibrated' : 'Default blueprint'}
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        {isCalibrated ? (
          <>
            Readiness scoring is using weights from the approved calibration run for{' '}
            <span className="font-medium">{source.schoolYear}</span>
            {source.appliedAt ? <> (approved {formatDate(source.appliedAt)})</> : null}.
          </>
        ) : (
          <>
            Readiness scoring is using the default EOC blueprint weights. No calibration
            run has been approved yet — approve a run below to apply calibrated weights.
          </>
        )}
      </p>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-100">
            <th className="py-2 font-medium">Reporting category</th>
            <th className="py-2 font-medium text-right">Weight</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([name, weight]) => (
            <tr key={name} className="border-b border-gray-50 last:border-0">
              <td className="py-2 text-gray-800">{name}</td>
              <td className="py-2 text-right font-medium text-gray-900 tabular-nums">
                {formatPercent(weight)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
