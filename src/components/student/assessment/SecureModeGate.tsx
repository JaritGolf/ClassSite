'use client'

/**
 * Focus Mode panels — presentational only. All state and event handling lives
 * in useSecureMode; these render it.
 *
 * The Begin gate exists for a hard browser reason, not a design one:
 * requestFullscreen() is rejected unless it originates from a user gesture, so
 * something must be clicked. Given that constraint, the panel is used to set
 * honest expectations up front — a student should never be surprised later that
 * leaving the page was noticed.
 *
 * Tone is deliberate: this is a 7th-grade product where "off-ramp is not
 * failure". Nothing here threatens a consequence, because there is none — the
 * teacher reviews a flag and decides.
 */

import { Mascot } from '@/components/ui/Mascot'

const PRESS_BUTTON =
  'rounded-2xl border-b-4 px-6 py-2.5 font-display text-base font-bold text-white transition-colors active:translate-y-[3px] active:border-b-0'

export function SecureModeGate({
  title,
  onBegin,
}: {
  title: string
  onBegin: () => void
}) {
  return (
    <div className="mx-auto max-w-prose rounded-2xl border-2 border-indigo-200 bg-white p-6 shadow-card">
      <div className="flex items-start gap-4">
        <Mascot pose="pointing" className="h-16 w-16 shrink-0" />
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-wide text-indigo-600">
            Focus Mode
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold text-gray-900">{title}</h2>
          <p className="mt-3 text-base leading-relaxed text-gray-700">
            This one counts, so it opens in full screen and copy &amp; paste are
            turned off.
          </p>
          <p className="mt-2 text-base leading-relaxed text-gray-700">
            If you leave this page, we&apos;ll make a note of it for your
            teacher. Your answers stay safe either way — nothing gets taken
            away.
          </p>
          <p className="mt-2 text-base leading-relaxed text-gray-700">
            Need to step away? Use <strong>Take a break</strong> any time.
            Breaks are never counted.
          </p>
          <button
            type="button"
            onClick={onBegin}
            className={`mt-5 border-indigo-800 bg-indigo-600 hover:bg-indigo-500 ${PRESS_BUTTON}`}
          >
            Begin
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Break overlay. Hides the questions entirely — a "break" that leaves the test
 * on screen is not a break, and this is the sanctioned alternative to tabbing
 * away, so it has to be genuinely usable.
 */
export function SecureModeBreak({ onResume }: { onResume: () => void }) {
  return (
    <div className="mx-auto max-w-prose rounded-2xl border-2 border-amber-200 bg-amber-50 p-6 text-center">
      <Mascot pose="happy" className="mx-auto h-16 w-16" />
      <h2 className="mt-3 font-display text-2xl font-bold text-gray-900">
        Break time
      </h2>
      <p className="mx-auto mt-2 max-w-prose text-base leading-relaxed text-gray-700">
        Take as long as you need. Your answers are saved and your timer
        isn&apos;t running out. This break is not counted.
      </p>
      <button
        type="button"
        onClick={onResume}
        className={`mt-5 border-amber-700 bg-amber-500 hover:bg-amber-400 ${PRESS_BUTTON}`}
      >
        I&apos;m ready
      </button>
    </div>
  )
}

/**
 * The student-facing record notice. `aria-live="polite"` so a screen-reader
 * user is told too, rather than the flag being a purely visual consequence.
 */
export function SecureModeNotice({
  eventCount,
  onTakeBreak,
}: {
  eventCount: number
  onTakeBreak: () => void
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-sky-200 bg-sky-50 px-4 py-3">
      <p aria-live="polite" className="text-base leading-snug text-gray-800">
        {eventCount === 0 ? (
          <>
            <span className="font-bold text-sky-700">Focus Mode is on.</span>{' '}
            Stay on this page until you finish.
          </>
        ) : (
          <>
            <span className="font-bold text-sky-700">
              We noted that you left this page.
            </span>{' '}
            Your teacher can see it. Keep going — your answers are safe.
          </>
        )}
      </p>
      <button
        type="button"
        onClick={onTakeBreak}
        className="shrink-0 rounded-xl border-2 border-sky-300 bg-white px-3 py-1.5 text-sm font-bold text-sky-800 transition-colors hover:bg-sky-100"
      >
        Take a break
      </button>
    </div>
  )
}
