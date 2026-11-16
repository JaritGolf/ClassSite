'use client'

/**
 * Badges — the catalog comes from the server (curriculum); which ones are
 * earned is read from this device.
 */

import { BadgeMedal, medalForIconKey } from '@/components/ui/BadgeMedal'
import { ExplainerHover } from '@/components/ui/ExplainerHover'
import { useLocalProgress } from '@/lib/local-progress/useLocalProgress'
import { useStudentShell } from '@/components/student/shell/StudentShell'

export function BadgeGallery() {
  const shell = useStudentShell()
  const { progress, hydrated } = useLocalProgress()

  if (!hydrated) {
    return <p className="py-16 text-center text-base text-gray-600">Loading your badges…</p>
  }

  const earnedNames = new Set(Object.keys(progress.badges))
  // Badges the engine can never award are hidden unless already earned.
  const allBadges = shell.badges.filter((b) => earnedNames.has(b.name) || b.winnable)
  const earnedCount = allBadges.filter((b) => earnedNames.has(b.name)).length

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

  const TRACK_EXPLAINERS: Record<string, string> = {
    MASTERY: 'Earned by mastering missions and reporting categories.',
    READING: 'Earned through the Source Decoder reading-skills track.',
    STRATEGY: 'Earned by completing test-taking strategy missions.',
    ENGAGEMENT: 'Earned for streaks and other everyday habits.',
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
            aria-valuenow={earnedCount}
            aria-valuemin={0}
            aria-valuemax={allBadges.length}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600"
              style={{
                width: `${allBadges.length > 0 ? (earnedCount / allBadges.length) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="font-display text-sm font-bold text-gray-700">
            {earnedCount} of {allBadges.length} earned
          </p>
        </div>
      </div>

      {Array.from(byTrack.entries()).map(([track, badges]) => (
        <section key={track}>
          <ExplainerHover
            title={TRACK_LABELS[track] ?? track}
            text={TRACK_EXPLAINERS[track] ?? 'A group of related badges.'}
            variant="plain"
          >
            <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-gray-600">
              {TRACK_LABELS[track] ?? track}
            </h2>
          </ExplainerHover>
          <div className="grid grid-cols-2 gap-3">
            {badges.map((badge) => {
              const earned = earnedNames.has(badge.name)
              const medal = medalForIconKey(badge.iconKey)
              return (
                <div
                  key={badge.name}
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
