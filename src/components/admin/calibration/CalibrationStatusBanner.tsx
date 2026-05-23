interface CalibrationStatusBannerProps {
  status: 'YEAR_ONE_NO_SCORES' | 'AWAITING_FIRST_RUN' | 'RUN_PENDING_APPROVAL' | 'RUN_APPROVED'
  scoreCount: number
}

const STATUS_CONFIG = {
  YEAR_ONE_NO_SCORES: {
    label: 'Calibration: Awaiting first cohort outcomes',
    description: 'Import EOC actual scores to enable calibration analysis.',
    color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    dot: 'bg-yellow-400',
  },
  AWAITING_FIRST_RUN: {
    label: 'Calibration: Scores imported — ready to run',
    description: 'Actual scores are available. Click "Run Calibration" to compute correlations.',
    color: 'bg-blue-50 border-blue-200 text-blue-800',
    dot: 'bg-blue-400',
  },
  RUN_PENDING_APPROVAL: {
    label: 'Calibration: Run pending approval',
    description: 'A calibration run has been computed. Review and approve recommended weights below.',
    color: 'bg-indigo-50 border-indigo-200 text-indigo-800',
    dot: 'bg-indigo-400',
  },
  RUN_APPROVED: {
    label: 'Calibration: Weights approved',
    description: 'The latest calibration run has been approved. Weights are stored for Phase 13 use.',
    color: 'bg-green-50 border-green-200 text-green-800',
    dot: 'bg-green-400',
  },
} as const

export function CalibrationStatusBanner({ status, scoreCount }: CalibrationStatusBannerProps) {
  const cfg = STATUS_CONFIG[status]
  return (
    <div className={`rounded-xl border p-4 ${cfg.color}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${cfg.dot}`} />
        <div>
          <p className="font-semibold text-sm">{cfg.label}</p>
          <p className="text-sm mt-0.5 opacity-80">{cfg.description}</p>
          {scoreCount > 0 && (
            <p className="text-xs mt-1 opacity-70">{scoreCount} student score{scoreCount !== 1 ? 's' : ''} on file</p>
          )}
        </div>
      </div>
    </div>
  )
}
