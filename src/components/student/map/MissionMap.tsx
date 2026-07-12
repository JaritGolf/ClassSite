import { Mascot } from '@/components/ui/Mascot'
import { BenchmarkNode, PATH_COLUMN_W, PATH_ROW_H, NODE_R } from './BenchmarkNode'

interface BenchmarkData {
  id: string
  code: string
  title: string
  status: string
  masteryScore: number | null
}

interface UnitData {
  id: string
  title: string
  sequenceOrder: number
  gameRegionName: string
  benchmarks: BenchmarkData[]
}

interface MissionMapProps {
  map: UnitData[]
}

/** Winding-path horizontal offsets, cycled per node. */
const OFFSETS = [0, 72, 0, -72]

/** Per-unit region theming so each unit feels like a new land. */
const REGION_THEMES = [
  { grad: 'from-indigo-600 to-indigo-800', border: 'border-indigo-900' },
  { grad: 'from-rose-600 to-rose-800', border: 'border-rose-900' },
  { grad: 'from-sky-600 to-sky-800', border: 'border-sky-900' },
  { grad: 'from-green-600 to-green-800', border: 'border-green-900' },
  { grad: 'from-amber-600 to-amber-800', border: 'border-amber-900' },
  { grad: 'from-purple-600 to-purple-800', border: 'border-purple-900' },
  { grad: 'from-orange-600 to-orange-800', border: 'border-orange-900' },
]

/** Dotted SVG trail through the node centers (decorative). */
function TrailSvg({ count }: { count: number }) {
  if (count < 2) return null
  const cx = PATH_COLUMN_W / 2
  const points = Array.from({ length: count }, (_, i) => ({
    x: cx + OFFSETS[i % OFFSETS.length],
    y: i * PATH_ROW_H + NODE_R,
  }))
  const height = (count - 1) * PATH_ROW_H + NODE_R * 2

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const cur = points[i]
    d += ` C ${prev.x} ${prev.y + 76}, ${cur.x} ${cur.y - 76}, ${cur.x} ${cur.y}`
  }

  return (
    <svg
      className="absolute left-0 top-0 text-indigo-400"
      width={PATH_COLUMN_W}
      height={height}
      viewBox={`0 0 ${PATH_COLUMN_W} ${height}`}
      aria-hidden="true"
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray="2 15"
        opacity="0.8"
      />
    </svg>
  )
}

export function MissionMap({ map }: MissionMapProps) {
  if (map.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-indigo-100 bg-white py-12 text-center shadow-card">
        <Mascot pose="thinking" className="mx-auto h-24 w-24" />
        <p className="mt-3 font-display text-lg font-bold text-gray-800">No missions available yet.</p>
        <p className="mt-1 text-sm text-gray-600">Check back soon — your Republic awaits.</p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {map.map((unit, unitIdx) => {
        const theme = REGION_THEMES[(unit.sequenceOrder - 1) % REGION_THEMES.length]
        const mastered = unit.benchmarks.filter((b) => b.status === 'MASTERED').length
        const total = unit.benchmarks.length
        const pct = total > 0 ? Math.round((mastered / total) * 100) : 0

        return (
          <section key={unit.id} className="animate-pop-in" style={{ animationDelay: `${unitIdx * 120}ms` }}>
            {/* Region banner */}
            <div className={`rounded-3xl border-b-4 ${theme.border} bg-gradient-to-br ${theme.grad} p-5 text-white`}>
              <p className="font-display text-xs font-bold uppercase tracking-widest text-white/90">
                Unit {unit.sequenceOrder} · Region
              </p>
              <h2 className="font-display text-2xl font-bold leading-tight">{unit.gameRegionName}</h2>
              <p className="mt-0.5 text-sm font-semibold text-white/90">{unit.title}</p>
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="h-3 flex-1 overflow-hidden rounded-full bg-black/25"
                  role="progressbar"
                  aria-label={`${unit.gameRegionName} progress`}
                  aria-valuenow={mastered}
                  aria-valuemin={0}
                  aria-valuemax={total}
                >
                  <div className="h-full rounded-full bg-white/90 transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="rounded-full bg-black/25 px-2.5 py-0.5 font-display text-xs font-bold">
                  {mastered}/{total} mastered
                </span>
              </div>
            </div>

            {/* Journey path */}
            <ol className="relative mx-auto mt-8 pb-2" style={{ width: PATH_COLUMN_W }}>
              <TrailSvg count={unit.benchmarks.length} />
              {unit.benchmarks.map((b, i) => (
                <BenchmarkNode
                  key={b.id}
                  id={b.id}
                  code={b.code}
                  title={b.title}
                  status={b.status}
                  masteryScore={b.masteryScore}
                  offsetX={OFFSETS[i % OFFSETS.length]}
                />
              ))}
            </ol>
          </section>
        )
      })}
    </div>
  )
}
