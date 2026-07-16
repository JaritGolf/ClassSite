import type { EocTrendPoint } from '@/lib/class-analytics'
import { TrendChart } from '@/components/teacher/shared/TrendChart'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

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
      <ExplainerHover
        title="EOC Readiness Trend"
        text="Your class's estimated EOC readiness, snapshotted daily over the last 90 days — a rising line means the class is trending toward exam-ready."
        theme="admin"
      >
        <h2 className="mb-3 text-sm font-semibold text-gray-700">EOC Readiness Trend (90 days)</h2>
      </ExplainerHover>
      <TrendChart
        points={chartPoints}
        height={120}
        label="EOC readiness trend over the last 90 days"
      />
    </div>
  )
}
