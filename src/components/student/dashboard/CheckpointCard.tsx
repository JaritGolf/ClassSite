import { TrackIcon } from '@/components/ui/TrackIcon'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

interface CheckpointCardProps {
  checkpointNumber: number
  endsOn: Date
  level: number
  maxLevel: number
  nextLevel: number | null
  missionsToNextLevel: number | null
  missionsPastTopTarget: number
}

/**
 * The student's standing at the current nine-week checkpoint.
 *
 * Copy rules (deliberate, see ADR 0019):
 *   - Talks only about progress, missions and checkpoints. It does not mention
 *     grades, and it does not say "this isn't a grade" either — a denial would
 *     drag school framing back in, which is exactly what the Level reframing
 *     exists to avoid.
 *   - Nothing punitive: no countdown timer, no red, no comparison to classmates.
 *     A student who is behind sees how far the next Level is, not a warning.
 *   - Level 0 is never printed as "Level 0"; it reads as a distance to Level 1.
 *
 * Colors are limited to tints the .cq-high-contrast override list already
 * neutralizes (indigo/amber 50-100, indigo 500-900, amber 400-600).
 */
export function CheckpointCard({
  checkpointNumber,
  endsOn,
  level,
  maxLevel,
  nextLevel,
  missionsToNextLevel,
  missionsPastTopTarget,
}: CheckpointCardProps) {
  // endsOn is a date-only value stored at UTC midnight — format it in UTC so the
  // calendar date shown is the one the teacher picked.
  const dateLabel = endsOn.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })

  const atTop = maxLevel > 0 && level >= maxLevel
  const pct = maxLevel > 0 ? Math.round((level / maxLevel) * 100) : 0

  let headline: string
  if (atTop) {
    headline = 'Checkpoint cleared!'
  } else if (level === 0) {
    headline =
      missionsToNextLevel === null
        ? 'Your next checkpoint is ahead'
        : `Level 1 is ${missionsToNextLevel} ${missionsToNextLevel === 1 ? 'mission' : 'missions'} away`
  } else {
    headline = `Level ${level} of ${maxLevel}`
  }

  let detail: string
  if (atTop) {
    detail =
      missionsPastTopTarget > 0
        ? `You're ${missionsPastTopTarget} ${missionsPastTopTarget === 1 ? 'mission' : 'missions'} past this checkpoint — keep going.`
        : `You reached everything set for this checkpoint. Keep going whenever you like.`
  } else if (nextLevel !== null && missionsToNextLevel !== null) {
    detail = `${missionsToNextLevel} ${missionsToNextLevel === 1 ? 'mission' : 'missions'} to Level ${nextLevel} · by ${dateLabel}`
  } else {
    detail = `Checkpoint date: ${dateLabel}`
  }

  return (
    <div className="rounded-2xl border-2 border-indigo-100 bg-white p-5 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-400 text-amber-950">
          <TrackIcon name="flag" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <ExplainerHover
            title={`Quarter ${checkpointNumber} Checkpoint`}
            text={
              'Your teacher marks a spot on the Mission Map for each quarter. Your Level shows how ' +
              'far along that map you have reached. Levels only track your progress — nothing on the ' +
              'map is ever locked by a date, so you can keep moving ahead as fast as you want.'
            }
          >
            <p className="font-display text-xs font-bold uppercase tracking-widest text-indigo-700">
              Quarter {checkpointNumber} Checkpoint
            </p>
          </ExplainerHover>

          <p className="mt-0.5 font-display text-2xl font-bold leading-tight text-indigo-900">
            {headline}
          </p>
          <p className="mt-1 text-sm text-gray-700">{detail}</p>

          {maxLevel > 0 && (
            <div
              className="mt-3 h-3 overflow-hidden rounded-full bg-indigo-100"
              role="progressbar"
              aria-label={`Quarter ${checkpointNumber} checkpoint progress`}
              aria-valuenow={level}
              aria-valuemin={0}
              aria-valuemax={maxLevel}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
