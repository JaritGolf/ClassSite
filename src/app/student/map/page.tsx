import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { MissionMap } from '@/components/student/map/MissionMap'

export const metadata = { title: 'Mission Map — My Civics Class' }

export default async function MapPage() {
  const session = await requireAuth(['STUDENT'])

  const student = await prisma.student.findUnique({
    where: { userId: session.user.userId },
    select: { id: true },
  })

  if (!student) {
    return <div className="p-8 text-center text-gray-500">Student record not found.</div>
  }

  const [units, progressRows] = await Promise.all([
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
      select: { benchmarkId: true, status: true, masteryScore: true },
    }),
  ])

  const progressByBenchmarkId = new Map(progressRows.map((p) => [p.benchmarkId, p]))

  const mapData = units.map((unit) => ({
    id: unit.id,
    title: unit.title,
    sequenceOrder: unit.sequenceOrder,
    gameRegionName: unit.gameRegionName,
    benchmarks: unit.benchmarks.map((b) => {
      const progress = progressByBenchmarkId.get(b.id)
      return {
        id: b.id,
        code: b.code,
        title: b.title,
        sequenceOrder: b.sequenceOrder,
        status: progress?.status ?? 'NOT_STARTED',
        masteryScore: progress?.masteryScore ?? null,
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
