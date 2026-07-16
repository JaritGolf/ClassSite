import { TrackIcon } from '@/components/ui/TrackIcon'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

interface ReadinessMeterProps {
  pct: number
  ciLow: number
  ciHigh: number
}

export function ReadinessMeter({ pct, ciLow, ciHigh }: ReadinessMeterProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border-2 border-indigo-100 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <TrackIcon name="target" className="h-5 w-5" />
          </span>
          <ExplainerHover
            title="EOC Readiness"
            text="Our best guess at your score if you took the real state EOC test today. It updates as you master more missions — it isn't a grade, just a helpful estimate."
          >
            <h2 className="font-display text-base font-bold text-gray-800">EOC Readiness</h2>
          </ExplainerHover>
        </div>
        <span className="font-display text-2xl font-bold text-indigo-700">{pct}%</span>
      </div>
      <div
        className="relative h-5 w-full overflow-hidden rounded-full bg-indigo-100"
        role="progressbar"
        aria-label="EOC readiness estimate"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* CI shading */}
        <div
          className="absolute top-0 h-full bg-indigo-200"
          style={{ left: `${ciLow}%`, width: `${ciHigh - ciLow}%` }}
        />
        {/* Main bar */}
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-sm text-gray-500">
        Confidence interval: {ciLow}%–{ciHigh}% · Calibrated from benchmark mastery
      </p>
    </div>
  )
}
