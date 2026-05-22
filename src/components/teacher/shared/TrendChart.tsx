/**
 * TrendChart — inline SVG line chart, no external chart library.
 *
 * Props:
 *   points  — array of {x: number|Date, y: number}
 *   height  — SVG height in px (default 120)
 *   label   — accessible aria-label
 */

interface TrendPoint {
  x: number | Date
  y: number
}

interface TrendChartProps {
  points: TrendPoint[]
  height?: number
  label?: string
}

const PADDING = { top: 12, right: 12, bottom: 24, left: 32 }

function toNumeric(x: number | Date): number {
  return x instanceof Date ? x.getTime() : x
}

export function TrendChart({ points, height = 120, label = 'Trend chart' }: TrendChartProps) {
  if (points.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-gray-50 text-xs text-gray-400"
        style={{ height }}
        aria-label={label}
      >
        No data yet
      </div>
    )
  }

  const width = 400
  const innerW = width - PADDING.left - PADDING.right
  const innerH = height - PADDING.top - PADDING.bottom

  const xs = points.map((p) => toNumeric(p.x))
  const ys = points.map((p) => p.y)

  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const rangeX = maxX - minX || 1
  const rangeY = maxY - minY || 1

  const toSvgX = (x: number) =>
    PADDING.left + ((x - minX) / rangeX) * innerW
  const toSvgY = (y: number) =>
    PADDING.top + innerH - ((y - minY) / rangeY) * innerH

  const pathD = points
    .map((p, i) => {
      const svgX = toSvgX(toNumeric(p.x))
      const svgY = toSvgY(p.y)
      return `${i === 0 ? 'M' : 'L'} ${svgX.toFixed(1)} ${svgY.toFixed(1)}`
    })
    .join(' ')

  // Y axis labels
  const yTicks = [minY, (minY + maxY) / 2, maxY].map((v) => ({
    value: Math.round(v),
    y: toSvgY(v),
  }))

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      role="img"
      aria-label={label}
      className="overflow-visible"
    >
      {/* Y tick lines + labels */}
      {yTicks.map((tick, i) => (
        <g key={i}>
          <line
            x1={PADDING.left}
            y1={tick.y}
            x2={PADDING.left + innerW}
            y2={tick.y}
            stroke="#e5e7eb"
            strokeDasharray="4 4"
          />
          <text
            x={PADDING.left - 4}
            y={tick.y + 4}
            textAnchor="end"
            className="fill-gray-400"
            style={{ fontSize: 9 }}
          >
            {tick.value}
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path
        d={`${pathD} L ${toSvgX(xs[xs.length - 1]).toFixed(1)} ${(PADDING.top + innerH).toFixed(1)} L ${PADDING.left.toFixed(1)} ${(PADDING.top + innerH).toFixed(1)} Z`}
        fill="rgb(99 102 241 / 0.1)"
      />

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke="rgb(99 102 241)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Points */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={toSvgX(toNumeric(p.x))}
          cy={toSvgY(p.y)}
          r={3}
          fill="white"
          stroke="rgb(99 102 241)"
          strokeWidth={2}
        />
      ))}
    </svg>
  )
}
