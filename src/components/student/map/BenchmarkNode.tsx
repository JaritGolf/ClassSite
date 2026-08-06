import Link from 'next/link'
import { Mascot } from '@/components/ui/Mascot'
import { TrackIcon, type TrackIconName } from '@/components/ui/TrackIcon'
import { ExplainerHover } from '@/components/ui/ExplainerHover'
import type { MissionNodeState } from '@/lib/mastery'

interface BenchmarkNodeProps {
  id: string
  code: string
  title: string
  /**
   * How this node should render, decided server-side by
   * `computeAvailability`. Deliberately NOT the raw StudentProgress status:
   * appearance is not a function of status alone, and treating it as one is
   * what produced the original bug — a freshly unlocked mission is status
   * NOT_STARTED, which this component used to draw as a padlock.
   */
  state: MissionNodeState
  masteryScore: number | null
  /** Whether the student may open this mission. Never inferred from `state`. */
  openable: boolean
  /**
   * Nine-week checkpoint target landing on this mission, if any. Display only —
   * a checkpoint never affects whether the mission can be opened.
   */
  checkpoint?: { checkpointNumber: number; level: number } | null
  /** Horizontal offset (px) of the node center from the path column's center. */
  offsetX: number
}

/** Journey-path geometry — shared with MissionMap's SVG trail. */
export const PATH_COLUMN_W = 320
/**
 * Row height must fit the TALLEST node, since rows are a fixed height and the
 * SVG trail is computed from this constant.
 *
 * A node is: 80px circle + code + a two-line title + status chip, and now also an
 * optional checkpoint flag chip. Measured in-browser: 144px (short title, no flag),
 * 159px (two-line title, no flag), 191px (two-line title + flag). The previous 152
 * already clipped two-line titles slightly; the flag made it obvious.
 */
export const PATH_ROW_H = 196
export const NODE_R = 40

/**
 * These three tables are keyed by `MissionNodeState`, NOT `Record<string, …>`.
 *
 * That is load-bearing. The loose string keys they used to have meant a missing
 * entry fell through to a `?? STATUS_NODE.NOT_STARTED` default, which is exactly
 * how an unlocked mission silently rendered as a padlock for months. With an
 * exhaustive Record, adding a state to the union without styling it is a
 * compile error instead of a wrong pixel.
 */
const STATE_NODE: Record<MissionNodeState, { circle: string; iconColor: string; icon: TrackIconName; chip: string }> = {
  MASTERED: { circle: 'bg-green-500 border-green-700', iconColor: 'text-white', icon: 'star', chip: 'bg-green-100 text-green-800 border-green-200' },
  IN_PROGRESS: { circle: 'bg-indigo-600 border-indigo-800', iconColor: 'text-white', icon: 'flag', chip: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  READY_FOR_MASTERY: { circle: 'bg-indigo-600 border-indigo-800', iconColor: 'text-white', icon: 'shield', chip: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  NEEDS_REMEDIATION: { circle: 'bg-amber-400 border-amber-600', iconColor: 'text-amber-950', icon: 'target', chip: 'bg-amber-100 text-amber-800 border-amber-200' },
  REMEDIATION_COMPLETE: { circle: 'bg-amber-400 border-amber-600', iconColor: 'text-amber-950', icon: 'check', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  EXPOSURE_COMPLETE: { circle: 'bg-sky-500 border-sky-700', iconColor: 'text-white', icon: 'check', chip: 'bg-gray-100 text-gray-600 border-gray-200' },
  TEACHER_OVERRIDE: { circle: 'bg-purple-600 border-purple-800', iconColor: 'text-white', icon: 'check', chip: 'bg-purple-100 text-purple-800 border-purple-200' },
  INTERVENTION_REQUIRED: { circle: 'bg-red-500 border-red-700', iconColor: 'text-white', icon: 'target', chip: 'bg-red-100 text-red-800 border-red-200' },
  // NOT_STARTED never reaches the screen — computeAvailability maps a granted
  // NOT_STARTED row to AVAILABLE and an ungranted one to LOCKED. Styled anyway
  // because the union includes it, and a blank node would be worse than a lock.
  NOT_STARTED: { circle: 'bg-gray-300 border-gray-400', iconColor: 'text-gray-600', icon: 'lock', chip: 'bg-gray-100 text-gray-600 border-gray-200' },
  // Reached and playable but not yet begun. Tints are on the
  // .cq-high-contrast neutralize list.
  AVAILABLE: { circle: 'bg-indigo-100 border-indigo-300', iconColor: 'text-indigo-700', icon: 'compass', chip: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  LOCKED: { circle: 'bg-gray-300 border-gray-400', iconColor: 'text-gray-600', icon: 'lock', chip: 'bg-gray-100 text-gray-600 border-gray-200' },
  // No content authored yet. Deliberately NOT a padlock: a padlock tells a
  // 12-year-old "you haven't earned this", when the truth is the mission does
  // not exist yet. Sparkle + slate reads as anticipation, not as a penalty.
  COMING_SOON: { circle: 'bg-slate-100 border-slate-300', iconColor: 'text-slate-500', icon: 'sparkle', chip: 'bg-slate-50 text-slate-600 border-slate-200' },
}

const STATE_LABELS: Record<MissionNodeState, string> = {
  MASTERED: 'Mastered',
  IN_PROGRESS: 'In Progress',
  NEEDS_REMEDIATION: 'Needs Remediation',
  REMEDIATION_COMPLETE: 'Remediation Complete',
  EXPOSURE_COMPLETE: 'Exposure Complete',
  TEACHER_OVERRIDE: 'Override',
  INTERVENTION_REQUIRED: 'Intervention Required',
  NOT_STARTED: 'Locked',
  READY_FOR_MASTERY: 'Ready for Challenge',
  AVAILABLE: 'Ready to Start',
  LOCKED: 'Locked',
  COMING_SOON: 'Coming Soon',
}

const STATE_EXPLAINERS: Record<MissionNodeState, string> = {
  MASTERED: "You've hit 80%+ on this mission's Mastery Challenge. It's done — nice work. Click to look back at anything from this mission any time.",
  IN_PROGRESS: "You've started this mission's training but haven't taken (or passed) the Mastery Challenge yet.",
  READY_FOR_MASTERY: "You've finished training on this mission — take the Mastery Challenge to lock it in.",
  NEEDS_REMEDIATION: "A Mastery Challenge attempt came up short. Finish the review activity here to try again.",
  REMEDIATION_COMPLETE: "You've finished the review activity — you're ready to retake the Mastery Challenge.",
  EXPOSURE_COMPLETE: 'This mission moved on after 3 tries plus review (an "off-ramp") — not a fail, and it unlocked the next mission. It shows up more often in your Daily Drill.',
  TEACHER_OVERRIDE: 'Your teacher manually updated this mission\'s status.',
  INTERVENTION_REQUIRED: "This mission needs extra help — check in with your teacher.",
  NOT_STARTED: 'Locked — master the mission before this one to unlock it.',
  AVAILABLE: "This mission is open — jump in whenever you're ready.",
  LOCKED: 'Locked — finish the mission before this one to open it.',
  COMING_SOON: "This mission isn't built yet. Nothing to do here — it'll open when your teacher adds it.",
}

export function BenchmarkNode({
  code,
  title,
  state,
  masteryScore,
  openable,
  checkpoint = null,
  offsetX,
}: BenchmarkNodeProps) {
  // Dimmed when it cannot be opened, whatever the reason. No `??` fallback: the
  // tables are exhaustive over the union, so a lookup cannot miss.
  const closed = !openable
  const node = STATE_NODE[state]
  const label = STATE_LABELS[state]
  const isCurrent = state === 'IN_PROGRESS' || state === 'READY_FOR_MASTERY'

  const inner = (
    <div
      data-testid="benchmark-node"
      className={`group flex w-36 flex-col items-center text-center ${closed ? 'opacity-60 grayscale cursor-not-allowed' : ''}`}
    >
      <div className="relative">
        <div
          className={`flex h-20 w-20 items-center justify-center rounded-full border-b-4 shadow-card transition-transform ${node.circle} ${node.iconColor} ${
            closed ? '' : 'group-hover:scale-105'
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
        {masteryScore !== null && state === 'MASTERED' && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-green-300 bg-white px-1.5 py-px font-display text-[11px] font-bold text-green-700">
            {Math.round(masteryScore * 100)}%
          </span>
        )}
      </div>
      {/* Nine-week checkpoint flag. Icon + text (never colour alone), and the
          text is real content so screen readers announce it with the node. */}
      {checkpoint && (
        <ExplainerHover
          title={`Quarter ${checkpoint.checkpointNumber} · Level ${checkpoint.level}`}
          text={
            `Reaching this mission puts you at Level ${checkpoint.level} for Quarter ` +
            `${checkpoint.checkpointNumber}. It marks how far along the map you've come — ` +
            `it never blocks you from moving ahead.`
          }
          variant="plain"
        >
          <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 font-display text-[11px] font-bold text-amber-900">
            <TrackIcon name="flag" className="h-3 w-3" strokeWidth={2.5} />
            Q{checkpoint.checkpointNumber} · Level {checkpoint.level}
          </span>
        </ExplainerHover>
      )}
      <p className="mt-2 font-mono text-[10px] text-gray-500">{code}</p>
      <p className="text-xs font-bold leading-tight text-gray-800 line-clamp-2">{title}</p>
      <ExplainerHover title={label} text={STATE_EXPLAINERS[state]} variant="plain">
        <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${node.chip}`}>
          {label}
        </span>
      </ExplainerHover>
    </div>
  )

  const left = PATH_COLUMN_W / 2 + offsetX - 72 // w-36 wrapper centered on the node

  return (
    <li className="relative list-none" style={{ height: PATH_ROW_H }}>
      <div className="absolute top-0" style={{ left }}>
        {closed ? (
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
