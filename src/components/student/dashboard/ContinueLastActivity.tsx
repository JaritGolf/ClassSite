import Link from 'next/link'
import { TrackIcon } from '@/components/ui/TrackIcon'
import type { LastActivityIcon } from '@/lib/student-activity'

export interface ContinueLastActivityData {
  label: string
  subLabel: string | null
  href: string
  icon: LastActivityIcon
  /** ISO string — serialized across the server/client boundary. */
  occurredAt: string
}

interface ContinueLastActivityProps {
  activity: ContinueLastActivityData | null
}

function formatRelativeDay(iso: string): string {
  const then = new Date(iso)
  const now = new Date()
  const startOfThen = new Date(then.getFullYear(), then.getMonth(), then.getDate())
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayDiff = Math.round((startOfNow.getTime() - startOfThen.getTime()) / 86400000)

  if (dayDiff <= 0) return 'Earlier today'
  if (dayDiff === 1) return 'Yesterday'
  if (dayDiff < 7) return `${dayDiff} days ago`
  return 'A while ago'
}

export function ContinueLastActivity({ activity }: ContinueLastActivityProps) {
  if (!activity) return null

  return (
    <Link
      href={activity.href}
      className="block rounded-2xl border-2 border-sky-200 bg-white p-5 shadow-card transition-colors hover:border-sky-300 hover:bg-sky-50"
    >
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-sky-400 text-sky-950">
          <TrackIcon name={activity.icon} className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-xs font-bold uppercase tracking-widest text-sky-700">
            Pick up where you left off
          </p>
          <p className="mt-0.5 truncate font-display text-base font-bold text-gray-900">
            {activity.label}
            {activity.subLabel ? ` — ${activity.subLabel}` : ''}
          </p>
          <p className="text-sm text-sky-800">{formatRelativeDay(activity.occurredAt)}</p>
        </div>
        <span aria-hidden="true" className="ml-auto flex-shrink-0 font-display text-xl font-bold text-sky-600">
          →
        </span>
      </div>
    </Link>
  )
}
