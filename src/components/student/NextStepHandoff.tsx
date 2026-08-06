'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TrackIcon } from '@/components/ui/TrackIcon'
import type { StudentPlan } from '@/lib/student-next-step'

/**
 * "Here is what to do now" — rendered wherever a student finishes something.
 *
 * ── The dead ends this replaces ──────────────────────────────────────────────
 * Every terminal screen used to send students to the Mission Map to work out
 * their own next move:
 *
 *   - Mastery Challenge passed → "Head to the Mission Map!" (the app knew which
 *     mission had just unlocked)
 *   - Mastery Challenge failed → "Remediation has been assigned" + a Map button
 *     (it assigned specific work and then did not link to it — the worst one)
 *   - Daily Drill finished     → "See you tomorrow!" (even mid-class)
 *   - Remediation with no reassessment available → "Back to Mission Map"
 *
 * One component so all four read identically and the copy lives in one place.
 *
 * ── Why it fetches ───────────────────────────────────────────────────────────
 * These are all client components rendering after a mutation, so the plan has to
 * be read after the fact. That is safe: `POST /api/assessment/[id]/submit` awaits
 * `updateProgressAfterAttempt` before responding, so by the time a caller mounts
 * this, the unlock and any freshly assigned remediation are already persisted.
 *
 * Never a dead end: if the fetch fails, the quiet fallback links still render.
 */

interface NextStepHandoffProps {
  /** Section label. Varies by context ("What's next", "Your next step"). */
  heading?: string
  /**
   * Extra nudge above the step, when the calling screen wants to connect the
   * result to the recommendation ("Let's fix this before you try again").
   */
  intro?: string
  /** Quiet escape hatches shown beneath the primary action. */
  secondary?: 'map' | 'dashboard' | 'both'
}

const SECONDARY_LINKS: Record<string, { href: string; label: string }[]> = {
  map: [{ href: '/student/map', label: 'Mission Map' }],
  dashboard: [{ href: '/student/dashboard', label: 'Dashboard' }],
  both: [
    { href: '/student/dashboard', label: 'Dashboard' },
    { href: '/student/map', label: 'Mission Map' },
  ],
}

export function NextStepHandoff({
  heading = "What's next",
  intro,
  secondary = 'both',
}: NextStepHandoffProps) {
  const [plan, setPlan] = useState<StudentPlan | null>(null)
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/student/next-step')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: StudentPlan | null) => {
        if (!cancelled) setPlan(data)
      })
      .catch(() => {
        /* fallback links below still render */
      })
      .finally(() => {
        if (!cancelled) setSettled(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const step = plan?.primary ?? null
  const links = SECONDARY_LINKS[secondary] ?? SECONDARY_LINKS.both

  // Reserve nothing while in flight: a completion screen that jumps around as
  // an async card lands is worse than one that fills in a beat later.
  if (!settled) {
    return (
      <div className="mx-auto mt-6 max-w-sm text-center text-sm text-gray-500">
        Working out your next step…
      </div>
    )
  }

  return (
    <div className="mx-auto mt-6 max-w-sm space-y-3 rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4 text-left animate-pop-in">
      <p className="font-display text-xs font-bold uppercase tracking-widest text-indigo-700">
        {heading}
      </p>

      {intro && <p className="text-base leading-snug text-indigo-950">{intro}</p>}

      {step ? (
        <>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <TrackIcon name={step.icon} className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-base font-bold leading-snug text-gray-900">
                {step.label}
              </p>
              <p className="text-sm leading-snug text-gray-700">{step.subLabel}</p>
              {step.estimatedMinutes !== null && (
                <p className="mt-0.5 text-sm text-gray-500">about {step.estimatedMinutes} min</p>
              )}
            </div>
          </div>

          <Link
            href={step.href}
            className="block rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-5 py-2.5 text-center font-display text-base font-bold text-white transition-colors hover:bg-indigo-500 active:translate-y-[3px] active:border-b-0"
          >
            {step.ctaLabel} →
          </Link>
        </>
      ) : (
        <p className="text-base text-gray-700">
          Pick up from your dashboard whenever you&apos;re ready.
        </p>
      )}

      {/* Guided, not trapped: the student can always go somewhere else. */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-0.5">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-sm font-semibold text-indigo-700 underline hover:text-indigo-900"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
