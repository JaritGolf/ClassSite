import Link from 'next/link'
import { BadgeMedal, medalForIconKey } from '@/components/ui/BadgeMedal'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

interface BadgeItem {
  id: string
  name: string
  iconKey: string
  description: string
}

interface BadgeRackProps {
  badges: BadgeItem[]
}

export function BadgeRack({ badges }: BadgeRackProps) {
  return (
    <div className="rounded-2xl border-2 border-indigo-100 bg-white p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-gray-800">Recent Badges</h2>
        <Link
          href="/student/badges"
          className="rounded-lg px-2 py-1 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800"
        >
          View all →
        </Link>
      </div>
      {badges.length === 0 ? (
        <p className="text-sm text-gray-500">Complete your first mission to earn a badge!</p>
      ) : (
        <div className="flex gap-3">
          {badges.map((badge) => {
            const medal = medalForIconKey(badge.iconKey)
            return (
              <ExplainerHover key={badge.id} title={badge.name} text={badge.description} variant="plain">
                <div className="flex w-24 flex-col items-center gap-1 rounded-2xl border border-indigo-100 bg-indigo-50 p-3">
                  <BadgeMedal color={medal.color} icon={medal.icon} earned className="h-14 w-14" />
                  <p className="line-clamp-2 text-center text-xs font-semibold leading-tight text-gray-700">
                    {badge.name}
                  </p>
                </div>
              </ExplainerHover>
            )
          })}
        </div>
      )}
    </div>
  )
}
