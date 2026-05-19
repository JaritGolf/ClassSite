import Link from 'next/link'

interface DrillCTAProps {
  drillCount: number
}

export function DrillCTA({ drillCount }: DrillCTAProps) {
  return (
    <Link
      href="/student/daily-drill"
      className="block rounded-xl border border-amber-200 bg-amber-50 p-4 hover:bg-amber-100 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-200 text-amber-800 text-lg">
          ⚡
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-900">Daily Republic Drill</p>
          <p className="text-xs text-amber-700">
            {drillCount > 0 ? `${drillCount} item${drillCount !== 1 ? 's' : ''} due today` : 'All caught up for today!'}
          </p>
        </div>
        <span className="ml-auto text-amber-600 text-sm">→</span>
      </div>
    </Link>
  )
}
