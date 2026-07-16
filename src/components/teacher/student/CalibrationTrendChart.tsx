import type { CalibrationTrendPoint } from '@/lib/student-profile'
import { TrendChart } from '@/components/teacher/shared/TrendChart'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

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
        <ExplainerHover
          title="Confidence Calibration"
          text="Whether this student's confidence ratings ('Very sure' / 'Pretty sure' / 'Not sure') match how often they're actually right. A rising trend means they're getting better at knowing what they know."
          theme="admin"
        >
          <h2 className="text-sm font-semibold text-gray-700">Confidence Calibration Trend</h2>
        </ExplainerHover>
        <div className="text-right">
          <ExplainerHover
            title="Overconfidence Gap"
            text="How often this student says 'Very sure' but answers incorrectly, compared to how often they're actually right when very sure. A bigger gap means more overconfidence."
            theme="admin"
          >
            <span
              className={`text-xs font-medium ${
                gapPct >= 30 ? 'text-red-600' : gapPct >= 15 ? 'text-yellow-600' : 'text-green-600'
              }`}
            >
              {gapLabel}
            </span>
          </ExplainerHover>
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
