import { TrackIcon, type TrackIconName } from '@/components/ui/TrackIcon'

/**
 * How a module differs from the shipped curriculum, for this teacher's classes.
 *
 * House rule (see BenchmarkNode.tsx): icon + text, NEVER colour alone. The
 * tint triples below are reused from that file, where they already meet
 * contrast; do not invent new ones.
 *
 * An untouched built-in module gets NO chip. Chipping the majority state is
 * noise, and the absence of a chip is itself the signal "this is the official
 * curriculum, exactly as it shipped".
 */
export type ModuleStatus = 'EDITED' | 'ADDED_BY_ME' | 'HIDDEN' | 'MOVED' | 'DIFFERS'

const CHIP: Record<
  ModuleStatus,
  { icon: TrackIconName; label: string; className: string; detail: string }
> = {
  EDITED: {
    icon: 'gear',
    label: 'Edited by me',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
    detail: 'You replaced the wording for this module. Your other classes see the original.',
  },
  ADDED_BY_ME: {
    icon: 'star',
    label: 'Added by me',
    className: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    detail: 'You created this module. It is not part of the shipped curriculum.',
  },
  HIDDEN: {
    icon: 'lock',
    label: 'Hidden from students',
    className: 'bg-gray-100 text-gray-700 border-gray-300',
    detail: 'Students will not see this module. You can show it again at any time.',
  },
  MOVED: {
    icon: 'flag',
    label: 'Moved',
    className: 'bg-sky-100 text-sky-800 border-sky-200',
    detail: 'You put this module in a different place than the curriculum has it.',
  },
  DIFFERS: {
    icon: 'search',
    label: 'Differs by class',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
    detail: 'Your classes do not all see the same version of this module.',
  },
}

export function ModuleStatusChip({
  status,
  classNames,
}: {
  status: ModuleStatus
  /** Names of the affected classes, for the screen-reader sentence. */
  classNames?: string[]
}) {
  const chip = CHIP[status]
  const where = classNames?.length ? ` In ${formatList(classNames)}.` : ''
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${chip.className}`}
    >
      <TrackIcon name={chip.icon} className="h-3 w-3" aria-hidden />
      {chip.label}
      {/*
        The full sentence lives here, not in a hover. ExplainerHover is
        hover-only by ADR 0016, so it can never be the sole carrier of a
        chip's meaning — keyboard and touch users would get nothing.
      */}
      <span className="sr-only">
        {' '}
        — {chip.detail}
        {where}
      </span>
    </span>
  )
}

function formatList(items: string[]): string {
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}
