/**
 * DailyActionPlan — the prioritized "what to address in this class today" list.
 *
 * Server component. Receives a plain `DailyActionItem[]` (already sorted by
 * priority) and renders each as a card tagged by category, with the affected
 * student names. Category labels carry an ExplainerHover so the meaning of
 * each trigger is one hover away.
 */

import type { DailyActionItem, ActionCategory } from '@/lib/daily-report'
import { AlertBadge } from '@/components/teacher/shared/AlertBadge'
import { EmptyState } from '@/components/teacher/shared/EmptyState'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

const CATEGORY_META: Record<
  ActionCategory,
  { label: string; tone: 'info' | 'warn' | 'critical'; explain: string }
> = {
  OFF_RAMP: {
    label: 'Off-ramp',
    tone: 'critical',
    explain:
      'The student failed the Mastery Challenge 3 times, completed remediation, and 7 days passed. The next benchmark unlocks automatically and spaced review increases — this is a check-in, not a failure.',
  },
  DECAY_SPIKE: {
    label: 'Decay spike',
    tone: 'warn',
    explain:
      'Half or more of the class recently reviewed this benchmark with low quality — retention is slipping class-wide. A quick re-prime or drill reverses it.',
  },
  REMEDIATION_OVERDUE: {
    label: 'Remediation overdue',
    tone: 'warn',
    explain:
      'Assigned review activities have been open more than 7 days without being completed. These students are stalling and need a nudge or in-class time.',
  },
  SMALL_GROUP: {
    label: 'Small group',
    tone: 'info',
    explain:
      'These students miss questions on the same benchmark for the same underlying misconception, so a single focused reteach reaches all of them at once.',
  },
  OVERCONFIDENCE: {
    label: 'Overconfidence',
    tone: 'info',
    explain:
      'These students mark "Very sure" but are frequently wrong — their confidence is not calibrated to their accuracy. A brief "slow down and check" coaching helps.',
  },
  DRILL_BACKLOG: {
    label: 'Drill backlog',
    tone: 'info',
    explain:
      'These students have a large queue of spaced-review items due. Reminding them to run the Daily Republic Drill keeps retention from decaying.',
  },
}

export function DailyActionPlan({ items }: { items: DailyActionItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Nothing flagged for today"
        body="No off-ramps, decay spikes, overdue remediation, or calibration concerns for this class right now. Keep them moving through their missions."
      />
    )
  }

  return (
    <ol className="space-y-3">
      {items.map((item, i) => {
        const meta = CATEGORY_META[item.category]
        return (
          <li
            key={`${item.category}-${item.benchmarkCode ?? i}`}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                {i + 1}
              </span>
              <AlertBadge tone={meta.tone}>
                <ExplainerHover text={meta.explain} theme="admin" variant="plain">
                  {meta.label}
                </ExplainerHover>
              </AlertBadge>
              {item.benchmarkCode && (
                <span className="font-mono text-xs text-gray-500">
                  {item.benchmarkCode}
                </span>
              )}
              <h3 className="text-sm font-semibold text-gray-900">
                {item.headline}
              </h3>
            </div>

            <p className="mt-2 text-sm text-gray-600">{item.detail}</p>

            {item.studentNames.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.studentNames.map((name) => (
                  <span
                    key={name}
                    className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700"
                  >
                    {name}
                  </span>
                ))}
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
