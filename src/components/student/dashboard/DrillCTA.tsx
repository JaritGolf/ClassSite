import Link from 'next/link'
import { TrackIcon } from '@/components/ui/TrackIcon'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

interface DrillCTAProps {
  drillCount: number
}

export function DrillCTA({ drillCount }: DrillCTAProps) {
  const due = drillCount > 0

  return (
    <Link
      href="/student/daily-drill"
      className="block rounded-2xl border-2 border-amber-200 bg-white p-5 shadow-card transition-colors hover:border-amber-300 hover:bg-amber-50"
    >
      <div className="flex items-center gap-4">
        <span
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-amber-950 ${
            due ? 'animate-bounce-soft' : ''
          }`}
        >
          <TrackIcon name="bolt" className="h-6 w-6" />
        </span>
        <div>
          <ExplainerHover
            title="Daily Republic Drill"
            text="A short daily review that brings back questions you're starting to forget, timed to when you're about to forget them. Answering keeps things fresh for the real EOC."
          >
            <p className="font-display text-base font-bold text-gray-900">Daily Republic Drill</p>
          </ExplainerHover>
          <p className="text-sm text-amber-800">
            {due
              ? `${drillCount} item${drillCount !== 1 ? 's' : ''} due today — keep your streak alive!`
              : 'All caught up for today!'}
          </p>
        </div>
        <span aria-hidden="true" className="ml-auto font-display text-xl font-bold text-amber-600">
          →
        </span>
      </div>
    </Link>
  )
}
