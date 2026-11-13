import { getStrategyMissionsServed } from '@/lib/strategy-track'
import { getPublishedClass } from '@/lib/student-content'
import { StrategyTrackList } from '@/components/student/strategy/StrategyTrackList'

export const metadata = { title: 'Strategy' }

/** Strategy missions are served without their answer key; uses are counted on the device. */
export default async function StrategyPage() {
  const publishedClass = await getPublishedClass()
  const missions = getStrategyMissionsServed()

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header>
        <p className="font-display text-xs font-bold uppercase tracking-widest text-purple-600">
          Parallel Track
        </p>
        <h1 className="font-display text-3xl font-bold text-indigo-900">Strategist Missions</h1>
        <p className="mt-1 text-base text-gray-600">
          Smart test-taking habits for the EOC. Practice each one as many times as you like.
        </p>
      </header>

      <StrategyTrackList missions={missions} required={publishedClass?.strategyUsesRequired ?? 0} />
    </div>
  )
}
