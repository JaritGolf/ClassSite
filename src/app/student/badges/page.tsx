import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { BadgeMedal, medalForIconKey } from '@/components/ui/BadgeMedal'

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
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-indigo-900">Your Badges</h1>
        <div className="mt-2 flex items-center gap-3">
          <div
            className="h-3 max-w-[240px] flex-1 overflow-hidden rounded-full bg-indigo-100"
            role="progressbar"
            aria-label="Badges earned"
            aria-valuenow={earnedIds.size}
            aria-valuemin={0}
            aria-valuemax={allBadges.length}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600"
              style={{
                width: `${allBadges.length > 0 ? (earnedIds.size / allBadges.length) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="font-display text-sm font-bold text-gray-700">
            {earnedIds.size} of {allBadges.length} earned
          </p>
        </div>
      </div>

      {Array.from(byTrack.entries()).map(([track, badges]) => (
        <section key={track}>
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-gray-600">
            {TRACK_LABELS[track] ?? track}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {badges.map((badge) => {
              const earned = earnedIds.has(badge.id)
              const medal = medalForIconKey(badge.iconKey)
              return (
                <div
                  key={badge.id}
                  className={`flex items-start gap-3 rounded-2xl border-2 p-4 ${
                    earned
                      ? 'border-indigo-100 bg-white shadow-card'
                      : 'border-dashed border-gray-300 bg-gray-50'
                  }`}
                >
                  <BadgeMedal
                    color={medal.color}
                    icon={medal.icon}
                    earned={earned}
                    className="h-14 w-14 flex-shrink-0"
                  />
                  <div>
                    <p
                      className={`font-display text-base font-bold leading-tight ${
                        earned ? 'text-gray-900' : 'text-gray-600'
                      }`}
                    >
                      {badge.name}
                    </p>
                    <p className="mt-0.5 text-sm leading-snug text-gray-600">{badge.description}</p>
                    {!earned && (
                      <p className="mt-1 text-sm italic text-gray-500">Keep going to earn this!</p>
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
