/**
 * ClassCalibrationTrend — SVG trend chart of class calibration score over time.
 */

import type { CalibrationTrendPoint } from '@/lib/calibration-analytics'
import { TrendChart } from '@/components/teacher/shared/TrendChart'

interface Props {
  points: CalibrationTrendPoint[]
}

export function ClassCalibrationTrend({ points }: Props) {
  const chartPoints = points.map((p) => ({
    x: p.weekStart,
    y: Math.round(p.calibrationScore * 100),
  }))

  const latest = points[points.length - 1]

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Class Calibration Trend</h2>
        {latest && (
          <span className="text-xs text-gray-500">
            Latest: {Math.round(latest.calibrationScore * 100)}% accuracy on high-confidence responses
          </span>
        )}
      </div>
      <TrendChart
        points={chartPoints}
        height={140}
        label="Class calibration score over time (percent of high-confidence answers correct)"
      />
      <p className="mt-2 text-xs text-gray-400">
        Score = % of &ldquo;Very sure&rdquo; responses that were correct. Higher = better calibrated.
      </p>
    </div>
  )
}
