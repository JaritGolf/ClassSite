import { BenchmarkNode } from './BenchmarkNode'

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

export function MissionMap({ map }: MissionMapProps) {
  if (map.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No missions available yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {map.map((unit) => (
        <section key={unit.id}>
          <div className="mb-3 flex items-baseline gap-2">
            <h2 className="text-lg font-bold text-gray-900">{unit.title}</h2>
            <span className="text-xs text-indigo-600 font-medium">{unit.gameRegionName}</span>
          </div>
          <div className="space-y-2">
            {unit.benchmarks.map((b) => (
              <BenchmarkNode
                key={b.id}
                id={b.id}
                code={b.code}
                title={b.title}
                status={b.status}
                masteryScore={b.masteryScore}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
