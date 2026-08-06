import Link from 'next/link'
import { Mascot } from '@/components/ui/Mascot'
import { TrackIcon } from '@/components/ui/TrackIcon'
import { ExplainerHover } from '@/components/ui/ExplainerHover'
import type { NextStep } from '@/lib/student-next-step'

/**
 * The one thing to do now.
 *
 * Supersedes `DashboardHero`, which greeted the student and offered a generic
 * "Continue Mission →". This does that job and the three other CTAs' jobs, and
 * it names the ACTUAL step ("You've unlocked the Mastery Challenge") instead of
 * saying "continue" — the difference between a signpost and a shrug.
 *
 * There is deliberately exactly ONE link in this card. The dashboard's old
 * failure was four competing calls-to-action of similar weight; nesting more
 * links here would rebuild that at a smaller scale.
 */

/** Eyebrow copy. Guidance carried by words, never by colour alone (rule #10). */
function eyebrowFor(step: NextStep): string {
  switch (step.kind) {
    case 'REMEDIATION':
      return 'Assigned for you'
    case 'ALL_CAUGHT_UP':
      return 'All caught up'
    case 'LAST_ACTIVITY':
      return 'Pick up where you left off'
    default:
      return 'Do this next'
  }
}

const EYEBROW_EXPLAINERS: Record<string, string> = {
  'Assigned for you':
    'A short Training Mission the app picked for you after a Mastery Challenge, aimed at the exact skill you missed. Finish it and you get another attempt.',
  'All caught up':
    "Nothing is due right now. New work appears here as soon as your teacher opens the next mission or a review comes due.",
  'Do this next':
    'The single best thing to work on right now, chosen from your missions, reviews, and assigned practice.',
  'Pick up where you left off':
    'The last thing you were working on, so you can get straight back into it.',
}

export function NextStepCard({
  step,
  studentName,
}: {
  step: NextStep
  studentName: string | null | undefined
}) {
  const eyebrow = eyebrowFor(step)
  const caughtUp = step.kind === 'ALL_CAUGHT_UP'

  return (
    <section
      aria-labelledby="next-step-heading"
      className="relative overflow-hidden rounded-3xl border-b-4 border-indigo-900 bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white"
    >
      {/* Decorative rings, matching the shell the old hero established. */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-14 h-56 w-56 text-white/10"
        viewBox="0 0 100 100"
        fill="currentColor"
      >
        <circle cx="50" cy="50" r="50" />
        <circle cx="50" cy="50" r="34" className="text-white/10" fill="currentColor" />
      </svg>

      <div className="relative flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-bold leading-tight sm:text-2xl">
            Welcome back, {studentName ?? 'Founder'}!
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
            <ExplainerHover title={eyebrow} text={EYEBROW_EXPLAINERS[eyebrow]} variant="plain">
              <span className="font-display text-xs font-bold uppercase tracking-widest text-amber-300">
                {eyebrow}
              </span>
            </ExplainerHover>
            {step.estimatedMinutes !== null && (
              <span className="text-sm text-indigo-200">about {step.estimatedMinutes} min</span>
            )}
          </div>

          {/* The step itself, on its own panel so it reads as the subject of the
              card rather than as more hero copy. */}
          <div className="mt-2 flex items-start gap-3 rounded-2xl border-2 border-white/20 bg-white/10 p-3.5">
            <span className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-400 text-amber-950">
              <TrackIcon name={step.icon} className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 id="next-step-heading" className="font-display text-lg font-bold leading-snug">
                {step.label}
              </h2>
              <p className="mt-0.5 text-base leading-snug text-indigo-100">{step.subLabel}</p>
            </div>
          </div>

          <Link
            href={step.href}
            className="mt-4 inline-block rounded-2xl border-b-4 border-amber-600 bg-amber-400 px-6 py-3 font-display text-base font-bold text-amber-950 transition-colors hover:bg-amber-300 active:translate-y-[3px] active:border-b-0"
          >
            {step.ctaLabel} →
          </Link>
        </div>

        <Mascot
          pose={caughtUp ? 'celebrating' : 'pointing'}
          className="hidden h-28 w-28 flex-shrink-0 animate-float sm:block sm:h-32 sm:w-32"
        />
      </div>
    </section>
  )
}
