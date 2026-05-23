import { RecommendedWeightsTable } from './RecommendedWeightsTable'
import { ApproveRunDialog } from './ApproveRunDialog'

interface CalibrationRun {
  id: string
  schoolYear: string
  correlationReadinessToScaled: number | null
  recommendedWeightChanges: Record<string, { current: number; recommended: number; deltaPercent: number }> | null
  applied: boolean
  runAt: string | Date
}

interface CalibrationRunCardProps {
  run: CalibrationRun
}

export function CalibrationRunCard({ run }: CalibrationRunCardProps) {
  const runAt = new Date(run.runAt)
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-5 py-4 flex items-start justify-between border-b border-gray-100">
        <div>
          <p className="font-semibold text-gray-900">Run — {run.schoolYear}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            {runAt.toLocaleDateString()} {runAt.toLocaleTimeString()}
          </p>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
            run.applied
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {run.applied ? 'Approved' : 'Pending'}
        </span>
      </div>
      <div className="px-5 py-4 space-y-4">
        {run.correlationReadinessToScaled != null && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Overall readiness → scaled score:</span>
            <span className="font-mono font-medium text-indigo-700">
              r = {run.correlationReadinessToScaled.toFixed(3)}
            </span>
          </div>
        )}
        {run.recommendedWeightChanges && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Recommended Weight Changes</p>
            <RecommendedWeightsTable recommendedWeightChanges={run.recommendedWeightChanges} />
          </div>
        )}
        {!run.applied && (
          <div className="pt-2">
            <ApproveRunDialog runId={run.id} schoolYear={run.schoolYear} />
          </div>
        )}
      </div>
    </div>
  )
}
