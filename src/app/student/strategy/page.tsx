import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getStrategyProgress, getStrategyMissions } from '@/lib/strategy-track'
import { StrategyTrackList } from '@/components/student/strategy/StrategyTrackList'

export default async function StrategyPage() {
  const session = await requireAuth(['STUDENT'])

  const student = await prisma.student.findUnique({
    where: { userId: session.user.userId },
    select: { id: true },
  })
  if (!student) {
    return (
      <div className="p-8 text-center text-gray-500">
        Student record not found. Please contact your teacher.
      </div>
    )
  }

  const { progress, completedCount } = await getStrategyProgress(student.id)
  const missions = getStrategyMissions()
  const completedCodes = progress.filter((p) => p.isCompleted).map((p) => p.code)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-purple-600">Parallel Track</p>
        <h1 className="text-2xl font-bold text-gray-900">Strategist Missions</h1>
        <p className="mt-1 text-sm text-gray-600">
          Smart test-taking habits for the EOC. {completedCount} of {missions.length} complete.
        </p>
      </header>

      <StrategyTrackList missions={missions} completedCodes={completedCodes} />
    </div>
  )
}
