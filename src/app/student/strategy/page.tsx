import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  getStrategyProgress,
  getStrategyMissionsForStudent,
} from '@/lib/strategy-track'
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

  const { progress, totalOwed, missionsMet, missionsRequired } =
    await getStrategyProgress(student.id)
  const missions = getStrategyMissionsForStudent(student.id)

  const summary =
    missionsRequired > 0
      ? `${missionsMet} of ${missionsRequired} strategies mastered — ${totalOwed} more ${
          totalOwed === 1 ? 'use' : 'uses'
        } to go.`
      : 'Smart test-taking habits for the EOC. Practice each one as many times as you like.'

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <header>
        <p className="font-display text-xs font-bold uppercase tracking-widest text-purple-600">
          Parallel Track
        </p>
        <h1 className="font-display text-3xl font-bold text-indigo-900">Strategist Missions</h1>
        <p className="mt-1 text-base text-gray-600">{summary}</p>
      </header>

      <StrategyTrackList missions={missions} progress={progress} />
    </div>
  )
}
