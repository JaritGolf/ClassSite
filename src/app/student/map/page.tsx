import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getMissionAvailability } from '@/lib/mastery'
import { getCheckpointMarkersForStudent } from '@/lib/progress-checkpoints'
import { MissionMap } from '@/components/student/map/MissionMap'

// The root layout's title template appends " — My Civics Class".
export const metadata = { title: 'Mission Map' }

export default async function MapPage() {
  const session = await requireAuth(['STUDENT'])

  const student = await prisma.student.findUnique({
    where: { userId: session.user.userId },
    select: { id: true },
  })

  if (!student) {
    return <div className="p-8 text-center text-gray-500">Student record not found.</div>
  }

  const [units, progressRows, availability, checkpointMarkers] = await Promise.all([
    prisma.unit.findMany({
      where: { active: true },
      orderBy: { sequenceOrder: 'asc' },
      include: {
        benchmarks: {
          orderBy: { sequenceOrder: 'asc' },
          select: { id: true, code: true, title: true, sequenceOrder: true },
        },
      },
    }),
    prisma.studentProgress.findMany({
      where: { studentId: student.id },
      select: { benchmarkId: true, masteryScore: true },
    }),
    // The single source of truth for what a node looks like and whether it
    // opens. This page deliberately does NOT derive either from `status` — that
    // divergence between the engine and the map is the bug being fixed here.
    getMissionAvailability(student.id),
    // Nine-week checkpoint flags. Display only — these never affect what opens.
    getCheckpointMarkersForStudent(student.id),
  ])

  const scoreByBenchmarkId = new Map(progressRows.map((p) => [p.benchmarkId, p.masteryScore]))

  const mapData = units.map((unit) => ({
    id: unit.id,
    title: unit.title,
    sequenceOrder: unit.sequenceOrder,
    gameRegionName: unit.gameRegionName,
    benchmarks: unit.benchmarks.map((b) => {
      // A benchmark always has an entry: computeAvailability walks the same
      // active-unit set this query does. COMING_SOON is the safe default if a
      // future caller ever passes one it has not seen.
      const node = availability.get(b.id)
      return {
        id: b.id,
        code: b.code,
        title: b.title,
        sequenceOrder: b.sequenceOrder,
        state: node?.state ?? ('COMING_SOON' as const),
        masteryScore: scoreByBenchmarkId.get(b.id) ?? null,
        openable: node?.openable ?? false,
        checkpoint: checkpointMarkers.get(b.id) ?? null,
      }
    }),
  }))

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 font-display text-3xl font-bold text-indigo-900">Mission Map</h1>
      <p className="mb-6 text-base text-gray-600">
        Follow the trail, master each mission, and build the Republic region by region.
      </p>
      <MissionMap map={mapData} />
    </div>
  )
}
