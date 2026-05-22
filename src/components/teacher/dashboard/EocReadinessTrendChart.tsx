import type { EocTrendPoint } from '@/lib/class-analytics'
import { TrendChart } from '@/components/teacher/shared/TrendChart'

interface EocReadinessTrendChartProps {
  points: EocTrendPoint[]
}

export function EocReadinessTrendChart({ points }: EocReadinessTrendChartProps) {
  const chartPoints = points.map((p) => ({
    x: new Date(p.date),
    y: p.readinessPercent,
  }))

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">EOC Readiness Trend (90 days)</h2>
      <TrendChart
        points={chartPoints}
        height={120}
        label="EOC readiness trend over the last 90 days"
      />
    </div>
  )
}
