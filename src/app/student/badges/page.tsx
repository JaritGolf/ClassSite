import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const metadata = { title: 'Badges — Civics Quest' }

export default async function BadgesPage() {
  const session = await requireAuth(['STUDENT'])

  const student = await prisma.student.findUnique({
    where: { userId: session.user.userId },
    select: { id: true },
  })

  if (!student) {
    return <div className="p-8 text-center text-gray-500">Student record not found.</div>
  }

  const [earnedBadges, allBadges] = await Promise.all([
    prisma.studentBadge.findMany({
      where: { studentId: student.id },
      select: { badgeId: true },
    }),
    prisma.badge.findMany({ orderBy: [{ track: 'asc' }, { name: 'asc' }] }),
  ])

  const earnedIds = new Set(earnedBadges.map((sb) => sb.badgeId))
  const byTrack = new Map<string, typeof allBadges>()
  for (const badge of allBadges) {
    if (!byTrack.has(badge.track)) byTrack.set(badge.track, [])
    byTrack.get(badge.track)!.push(badge)
  }

  const TRACK_LABELS: Record<string, string> = {
    MASTERY: 'Mastery',
    READING: 'Reading',
    STRATEGY: 'Strategy',
    ENGAGEMENT: 'Engagement',
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Your Badges</h1>
        <p className="text-sm text-gray-500 mt-1">
          {earnedIds.size} of {allBadges.length} earned
        </p>
      </div>

      {Array.from(byTrack.entries()).map(([track, badges]) => (
        <section key={track}>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {TRACK_LABELS[track] ?? track}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {badges.map((badge) => {
              const earned = earnedIds.has(badge.id)
              return (
                <div
                  key={badge.id}
                  className={`rounded-xl border p-4 flex gap-3 items-start ${
                    earned
                      ? 'border-indigo-200 bg-indigo-50'
                      : 'border-gray-200 bg-gray-50 opacity-60'
                  }`}
                >
                  <div
                    className={`h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-lg ${
                      earned ? 'bg-indigo-200 text-indigo-700' : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {badge.name[0]}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${earned ? 'text-gray-900' : 'text-gray-500'}`}>
                      {badge.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{badge.description}</p>
                    {!earned && (
                      <p className="text-xs text-gray-400 mt-1 italic">Not yet earned</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
