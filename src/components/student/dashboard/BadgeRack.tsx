import Link from 'next/link'

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
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Recent Badges</h2>
        <Link href="/student/badges" className="text-xs text-indigo-600 hover:underline">
          View all
        </Link>
      </div>
      {badges.length === 0 ? (
        <p className="text-xs text-gray-400">Complete your first mission to earn a badge!</p>
      ) : (
        <div className="flex gap-3">
          {badges.map((badge) => (
            <div
              key={badge.id}
              title={badge.description}
              className="flex flex-col items-center gap-1 rounded-lg border border-gray-100 bg-indigo-50 p-3 w-20"
            >
              <div className="h-8 w-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 text-sm font-bold">
                {badge.name[0]}
              </div>
              <p className="text-xs text-gray-600 text-center leading-tight line-clamp-2">{badge.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
