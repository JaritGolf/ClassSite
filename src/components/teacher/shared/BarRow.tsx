/**
 * BarRow — small inline bar showing a percentage value with label.
 * Used in dimension breakdowns; no external chart library.
 */

interface BarRowProps {
  label: string
  correctRate: number  // 0–100 (percentage)
  sampleSize: number
}

export function BarRow({ label, correctRate, sampleSize }: BarRowProps) {
  const pct = Math.min(100, Math.max(0, correctRate))
  const color =
    pct >= 80 ? 'bg-green-400' : pct >= 60 ? 'bg-yellow-400' : 'bg-red-400'

  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs text-gray-600">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-gray-100" style={{ height: 8 }}>
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
          role="presentation"
        />
      </div>
      <span className="w-16 shrink-0 text-right text-xs tabular-nums text-gray-600">
        {pct.toFixed(1)}% <span className="text-gray-400">({sampleSize})</span>
      </span>
    </div>
  )
}
