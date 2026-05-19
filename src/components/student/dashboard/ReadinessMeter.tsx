interface ReadinessMeterProps {
  pct: number
  ciLow: number
  ciHigh: number
}

export function ReadinessMeter({ pct, ciLow, ciHigh }: ReadinessMeterProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">EOC Readiness Estimate</h2>
        <span className="text-lg font-bold text-indigo-700">{pct}%</span>
      </div>
      <div className="relative h-4 w-full rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        {/* CI shading */}
        <div
          className="absolute top-0 h-full bg-indigo-100"
          style={{ left: `${ciLow}%`, width: `${ciHigh - ciLow}%` }}
        />
        {/* Main bar */}
        <div
          className="absolute top-0 left-0 h-full rounded-full bg-indigo-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-400">
        Confidence interval: {ciLow}%–{ciHigh}% · Calibrated from benchmark mastery
      </p>
    </div>
  )
}
