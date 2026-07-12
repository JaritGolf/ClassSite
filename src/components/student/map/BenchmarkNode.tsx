import Link from 'next/link'
import { Mascot } from '@/components/ui/Mascot'
import { TrackIcon, type TrackIconName } from '@/components/ui/TrackIcon'

interface BenchmarkNodeProps {
  id: string
  code: string
  title: string
  status: string
  masteryScore: number | null
  /** Horizontal offset (px) of the node center from the path column's center. */
  offsetX: number
}

/** Journey-path geometry — shared with MissionMap's SVG trail. */
export const PATH_COLUMN_W = 320
export const PATH_ROW_H = 152
export const NODE_R = 40

const STATUS_NODE: Record<string, { circle: string; iconColor: string; icon: TrackIconName; chip: string }> = {
  MASTERED: { circle: 'bg-green-500 border-green-700', iconColor: 'text-white', icon: 'star', chip: 'bg-green-100 text-green-800 border-green-200' },
  IN_PROGRESS: { circle: 'bg-indigo-600 border-indigo-800', iconColor: 'text-white', icon: 'flag', chip: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  READY_FOR_MASTERY: { circle: 'bg-indigo-600 border-indigo-800', iconColor: 'text-white', icon: 'shield', chip: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  NEEDS_REMEDIATION: { circle: 'bg-amber-400 border-amber-600', iconColor: 'text-amber-950', icon: 'target', chip: 'bg-amber-100 text-amber-800 border-amber-200' },
  REMEDIATION_COMPLETE: { circle: 'bg-amber-400 border-amber-600', iconColor: 'text-amber-950', icon: 'check', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  EXPOSURE_COMPLETE: { circle: 'bg-sky-500 border-sky-700', iconColor: 'text-white', icon: 'check', chip: 'bg-gray-100 text-gray-600 border-gray-200' },
  TEACHER_OVERRIDE: { circle: 'bg-purple-600 border-purple-800', iconColor: 'text-white', icon: 'check', chip: 'bg-purple-100 text-purple-800 border-purple-200' },
  INTERVENTION_REQUIRED: { circle: 'bg-red-500 border-red-700', iconColor: 'text-white', icon: 'target', chip: 'bg-red-100 text-red-800 border-red-200' },
  NOT_STARTED: { circle: 'bg-gray-300 border-gray-400', iconColor: 'text-gray-600', icon: 'lock', chip: 'bg-gray-100 text-gray-600 border-gray-200' },
}

const STATUS_LABELS: Record<string, string> = {
  MASTERED: 'Mastered',
  IN_PROGRESS: 'In Progress',
  NEEDS_REMEDIATION: 'Needs Remediation',
  REMEDIATION_COMPLETE: 'Remediation Complete',
  EXPOSURE_COMPLETE: 'Exposure Complete',
  TEACHER_OVERRIDE: 'Override',
  INTERVENTION_REQUIRED: 'Intervention Required',
  NOT_STARTED: 'Not Started',
  READY_FOR_MASTERY: 'Ready for Challenge',
}

const LOCKED_STATUSES = new Set(['NOT_STARTED'])

export function BenchmarkNode({ code, title, status, masteryScore, offsetX }: BenchmarkNodeProps) {
  const locked = LOCKED_STATUSES.has(status)
  const node = STATUS_NODE[status] ?? STATUS_NODE.NOT_STARTED
  const label = STATUS_LABELS[status] ?? status
  const isCurrent = status === 'IN_PROGRESS' || status === 'READY_FOR_MASTERY'

  const inner = (
    <div
      data-testid="benchmark-node"
      className={`group flex w-36 flex-col items-center text-center ${locked ? 'opacity-60 grayscale cursor-not-allowed' : ''}`}
    >
      <div className="relative">
        <div
          className={`flex h-20 w-20 items-center justify-center rounded-full border-b-4 shadow-card transition-transform ${node.circle} ${node.iconColor} ${
            locked ? '' : 'group-hover:scale-105'
          } ${isCurrent ? 'ring-4 ring-indigo-300' : ''}`}
        >
          <TrackIcon name={node.icon} className="h-8 w-8" strokeWidth={2.2} />
        </div>
        {/* "You are here" marker on the current mission */}
        {isCurrent && (
          <Mascot
            pose="pointing"
            className={`absolute top-0 h-14 w-14 animate-float ${offsetX > 0 ? '-left-16' : '-right-16'}`}
            title="You are here"
          />
        )}
        {masteryScore !== null && status === 'MASTERED' && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-green-300 bg-white px-1.5 py-px font-display text-[11px] font-bold text-green-700">
            {Math.round(masteryScore * 100)}%
          </span>
        )}
      </div>
      <p className="mt-2 font-mono text-[10px] text-gray-500">{code}</p>
      <p className="text-xs font-bold leading-tight text-gray-800 line-clamp-2">{title}</p>
      <span className={`mt-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${node.chip}`}>
        {label}
      </span>
    </div>
  )

  const left = PATH_COLUMN_W / 2 + offsetX - 72 // w-36 wrapper centered on the node

  return (
    <li className="relative list-none" style={{ height: PATH_ROW_H }}>
      <div className="absolute top-0" style={{ left }}>
        {locked ? (
          inner
        ) : (
          <Link href={`/student/mission/${code}`} className="block rounded-3xl">
            {inner}
          </Link>
        )}
      </div>
    </li>
  )
}
