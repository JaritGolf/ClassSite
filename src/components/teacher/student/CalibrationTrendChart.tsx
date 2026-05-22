import type { CalibrationTrendPoint } from '@/lib/student-profile'
import { TrendChart } from '@/components/teacher/shared/TrendChart'

interface CalibrationTrendChartProps {
  trend: CalibrationTrendPoint[]
  overallGap: number
}

export function CalibrationTrendChart({ trend, overallGap }: CalibrationTrendChartProps) {
  const chartPoints = trend.map((p) => ({
    x: new Date(p.weekStart),
    y: Math.round(p.calibrationScore * 100),
  }))

  const gapPct = Math.round(overallGap * 100)
  const gapLabel =
    gapPct >= 30 ? 'High overconfidence' : gapPct >= 15 ? 'Moderate' : 'Well calibrated'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Confidence Calibration Trend</h2>
        <div className="text-right">
          <span
            className={`text-xs font-medium ${
              gapPct >= 30 ? 'text-red-600' : gapPct >= 15 ? 'text-yellow-600' : 'text-green-600'
            }`}
          >
            {gapLabel}
          </span>
          <p className="text-xs text-gray-400">Gap: {gapPct}%</p>
        </div>
      </div>
      <TrendChart
        points={chartPoints}
        height={120}
        label="Confidence calibration score trend by week (0-100, higher is better)"
      />
      {trend.length === 0 && (
        <p className="mt-2 text-xs text-gray-400">No calibration data yet.</p>
      )}
    </div>
  )
}
