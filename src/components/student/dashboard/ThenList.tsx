import Link from 'next/link'
import { TrackIcon } from '@/components/ui/TrackIcon'
import { ExplainerHover } from '@/components/ui/ExplainerHover'
import type { NextStep } from '@/lib/student-next-step'

/**
 * What comes after the current step.
 *
 * The point is sequence, not choice: students should be able to see the shape of
 * their session without four equally-loud buttons competing for the first click.
 * So these are deliberately quiet — small rows, one line each, numbered
 * continuing from the primary card (which is step 1).
 *
 * A real `<ol>`: the order is the information, so it belongs in the markup and
 * not only in the visual sequence.
 */
export function ThenList({ steps }: { steps: NextStep[] }) {
  if (steps.length === 0) return null

  return (
    <section aria-labelledby="then-list-heading" className="px-1">
      <ExplainerHover
        title="Then"
        text="What the app suggests after you finish the step above. You can do these in any order — this is just the order we'd recommend."
      >
        <h2
          id="then-list-heading"
          className="font-display text-xs font-bold uppercase tracking-widest text-indigo-700"
        >
          Then
        </h2>
      </ExplainerHover>

      <ol className="mt-2 space-y-2">
        {steps.map((step, i) => (
          <li key={`${step.kind}-${step.href}`}>
            <Link
              href={step.href}
              className="flex items-center gap-3 rounded-2xl border-2 border-indigo-100 bg-white px-3.5 py-3 transition-colors hover:border-indigo-300 hover:bg-indigo-50"
            >
              {/* The step number. aria-hidden because the <ol> already conveys
                  position to assistive tech — announcing "2" twice is noise. */}
              <span
                aria-hidden="true"
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100 font-display text-sm font-bold text-indigo-800"
              >
                {i + 2}
              </span>
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                <TrackIcon name={step.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-base font-bold leading-snug text-gray-900">
                  {step.label}
                </span>
                <span className="block text-sm leading-snug text-gray-600">{step.subLabel}</span>
              </span>
              {step.estimatedMinutes !== null && (
                <span className="hidden flex-shrink-0 text-sm text-gray-500 sm:block">
                  about {step.estimatedMinutes} min
                </span>
              )}
              <span aria-hidden="true" className="font-display text-lg font-bold text-indigo-400">
                →
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
