/**
 * Authored SVG illustration scenes for lesson IMAGE steps (ADR 0015).
 *
 * Registry pattern (like TrackIcon's PATHS): ImageSchema references a scene as
 * `svg:<key>`; ImageStepView resolves it here. Scenes are pure inline SVG in
 * the bright learning-game palette (see Mascot.tsx) — no assets, no requests.
 *
 * Every scene is decorative-by-default (`aria-hidden`): the ImageStepView
 * wrapper owns the accessible name (role="img" + aria-label from the authored
 * alt text), so scenes must NOT set their own roles or titles.
 */

import type { ReactNode } from 'react'
import { illustrationKeys, type IllustrationKey } from './keys'

export { illustrationKeys, type IllustrationKey } from './keys'

const NAVY = '#312e81' // indigo-900
const NAVY_LIGHT = '#4338ca' // indigo-700
const NAVY_DEEP = '#1e1b4b' // indigo-950
const GOLD = '#f59e0b' // amber-500
const GOLD_DEEP = '#d97706' // amber-600
const CREAM = '#fffbeb' // amber-50 — parchment
const PAPER_EDGE = '#fcd34d' // amber-300
const SKY = '#e0e7ff' // indigo-100 — backdrop wash
const GREEN = '#16a34a' // green-600
const ROSE = '#e11d48' // rose-600
const INK = '#1f2937' // gray-800

/** People row: simple head+shoulders figures ("the people"). */
function crowd(cx: number, cy: number, colors: string[]): ReactNode {
  return (
    <g key={`crowd-${cx}-${cy}`}>
      {colors.map((c, i) => {
        const x = cx + i * 34
        return (
          <g key={i}>
            <circle cx={x} cy={cy} r="9" fill={c} />
            <path d={`M${x - 13} ${cy + 24} q13 -16 26 0 z`} fill={c} />
          </g>
        )
      })}
    </g>
  )
}

const scenes: Record<IllustrationKey, ReactNode> = {
  /** Two hands meeting over an agreement — consent of the governed. */
  'social-contract-handshake': (
    <>
      <rect x="0" y="0" width="360" height="220" rx="16" fill={SKY} />
      {/* Government: dome + columns, up top */}
      <g>
        <path d="M130 62 a50 30 0 0 1 100 0 z" fill={NAVY} />
        <rect x="124" y="62" width="112" height="8" rx="3" fill={NAVY_DEEP} />
        {[138, 160, 182, 204].map((x) => (
          <rect key={x} x={x} y="70" width="10" height="22" rx="2" fill={NAVY_LIGHT} />
        ))}
        <rect x="124" y="92" width="112" height="8" rx="3" fill={NAVY_DEEP} />
        <circle cx="180" cy="30" r="5" fill={GOLD} />
        <rect x="178" y="30" width="4" height="10" fill={GOLD_DEEP} />
      </g>
      {/* The agreement: parchment between the hands */}
      <rect x="140" y="112" width="80" height="52" rx="6" fill={CREAM} stroke={PAPER_EDGE} strokeWidth="3" />
      {[124, 134, 144].map((y) => (
        <rect key={y} x="150" y={y} width="60" height="4" rx="2" fill={GOLD_DEEP} opacity="0.5" />
      ))}
      <circle cx="180" cy="156" r="6" fill={ROSE} />
      {/* Handshake across the parchment */}
      <path d="M96 140 q34 -18 70 -2" stroke={NAVY} strokeWidth="16" strokeLinecap="round" fill="none" />
      <path d="M264 140 q-34 -18 -70 -2" stroke={GOLD} strokeWidth="16" strokeLinecap="round" fill="none" />
      <circle cx="180" cy="135" r="11" fill={GOLD_DEEP} />
      {/* The people, below */}
      {crowd(60, 196, [NAVY_LIGHT, GOLD, ROSE, GREEN, NAVY, GOLD_DEEP, NAVY_LIGHT])}
    </>
  ),

  /** A crown outweighed by the law on a balance scale — limited government. */
  'crown-vs-law': (
    <>
      <rect x="0" y="0" width="360" height="220" rx="16" fill={SKY} />
      {/* Scale post + arm (law side lower = heavier) */}
      <rect x="174" y="52" width="12" height="130" rx="5" fill={NAVY_DEEP} />
      <path d="M96 84 L264 60" stroke={NAVY_DEEP} strokeWidth="10" strokeLinecap="round" />
      <circle cx="180" cy="72" r="10" fill={GOLD} />
      <rect x="130" y="182" width="100" height="14" rx="6" fill={NAVY_DEEP} />
      {/* Crown pan (high, lighter) */}
      <path d="M96 84 v18" stroke={NAVY} strokeWidth="4" />
      <path d="M56 102 h80 l-8 16 h-64 z" fill={NAVY_LIGHT} />
      <path d="M74 96 l6 -14 8 9 8 -13 8 13 8 -9 6 14 z" fill={GOLD} stroke={GOLD_DEEP} strokeWidth="2" />
      {/* Law pan (low, heavier): parchment marked with a gavel */}
      <path d="M264 60 v52" stroke={NAVY} strokeWidth="4" />
      <path d="M224 112 h80 l-8 16 h-64 z" fill={NAVY_LIGHT} />
      <rect x="238" y="72" width="52" height="40" rx="5" fill={CREAM} stroke={PAPER_EDGE} strokeWidth="3" />
      {[82, 90, 98].map((y) => (
        <rect key={y} x="245" y={y} width="38" height="4" rx="2" fill={GOLD_DEEP} opacity="0.5" />
      ))}
      {/* Watching citizens */}
      {crowd(28, 196, [GOLD, NAVY_LIGHT, ROSE, GREEN])}
      {crowd(232, 196, [NAVY, GOLD_DEEP, NAVY_LIGHT])}
    </>
  ),

  /** Meeting house with raised hands — colonial self-government. */
  'colonial-town-meeting': (
    <>
      <rect x="0" y="0" width="360" height="220" rx="16" fill={SKY} />
      {/* Meeting house */}
      <rect x="120" y="72" width="120" height="70" rx="4" fill={CREAM} stroke={PAPER_EDGE} strokeWidth="3" />
      <path d="M110 74 L180 30 L250 74 z" fill={ROSE} />
      <rect x="170" y="104" width="22" height="38" rx="3" fill={NAVY} />
      <rect x="136" y="88" width="18" height="18" rx="3" fill={NAVY_LIGHT} />
      <rect x="206" y="88" width="18" height="18" rx="3" fill={NAVY_LIGHT} />
      <rect x="176" y="12" width="4" height="22" fill={NAVY_DEEP} />
      <path d="M180 14 h26 l-6 6 6 6 h-26 z" fill={GOLD} />
      {/* Townspeople with raised hands (voting voice) */}
      <g>
        {[
          { x: 52, c: NAVY_LIGHT },
          { x: 88, c: GOLD },
          { x: 272, c: GREEN },
          { x: 308, c: ROSE },
        ].map(({ x, c }) => (
          <g key={x}>
            <circle cx={x} cy="156" r="11" fill={c} />
            <path d={`M${x - 16} 188 q16 -20 32 0 z`} fill={c} />
            <path d={`M${x + 10} 150 q12 -12 8 -22`} stroke={c} strokeWidth="7" strokeLinecap="round" fill="none" />
          </g>
        ))}
      </g>
      {crowd(130, 186, [NAVY, GOLD_DEEP, NAVY_LIGHT])}
    </>
  ),

  /** Quill signing a declaration parchment. */
  'quill-declaration': (
    <>
      <rect x="0" y="0" width="360" height="220" rx="16" fill={SKY} />
      <rect x="84" y="36" width="192" height="150" rx="8" fill={CREAM} stroke={PAPER_EDGE} strokeWidth="4" />
      <rect x="104" y="56" width="152" height="9" rx="4" fill={GOLD_DEEP} opacity="0.65" />
      {[76, 90, 104, 118].map((y) => (
        <rect key={y} x="104" y={y} width="152" height="5" rx="2.5" fill={INK} opacity="0.25" />
      ))}
      {/* Bold signature line */}
      <path d="M104 152 q16 -12 30 0 q10 8 26 -2" stroke={NAVY} strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* Quill */}
      <g>
        <path d="M212 158 L292 60 q16 -14 22 2 q4 14 -14 22 L216 162 z" fill={GOLD} stroke={GOLD_DEEP} strokeWidth="2" />
        <path d="M212 158 l-10 16 16 -8 z" fill={NAVY_DEEP} />
        <path d="M292 60 q-40 44 -76 96" stroke={GOLD_DEEP} strokeWidth="2" fill="none" />
      </g>
      <circle cx="130" cy="170" r="6" fill={ROSE} />
    </>
  ),

  /** A chain of state links with the center link snapped — the Articles' weakness. */
  'weak-links-chain': (
    <>
      <rect x="0" y="0" width="360" height="220" rx="16" fill={SKY} />
      {/* Left run of links */}
      {[34, 76, 118].map((x) => (
        <ellipse key={x} cx={x} cy="110" rx="26" ry="17" fill="none" stroke={NAVY} strokeWidth="11" />
      ))}
      {/* Broken center link */}
      <path d="M142 100 a26 17 0 0 1 30 -6" stroke={ROSE} strokeWidth="11" strokeLinecap="round" fill="none" />
      <path d="M218 122 a26 17 0 0 1 -32 4" stroke={ROSE} strokeWidth="11" strokeLinecap="round" fill="none" />
      {/* Crack sparks */}
      <path d="M180 84 l6 -14 M188 92 l14 -8 M172 88 l-4 -12" stroke={GOLD_DEEP} strokeWidth="4" strokeLinecap="round" />
      {/* Right run of links */}
      {[242, 284, 326].map((x) => (
        <ellipse key={x} cx={x} cy="110" rx="26" ry="17" fill="none" stroke={NAVY} strokeWidth="11" />
      ))}
      {/* Thirteen stars above */}
      {Array.from({ length: 13 }).map((_, i) => (
        <circle key={i} cx={30 + i * 25} cy={i % 2 === 0 ? 38 : 50} r="5" fill={GOLD} />
      ))}
    </>
  ),

  /** Two rival plans merging into one signed document — the Great Compromise. */
  'convention-compromise': (
    <>
      <rect x="0" y="0" width="360" height="220" rx="16" fill={SKY} />
      {/* Rival speech bubbles */}
      <g>
        <rect x="24" y="34" width="118" height="58" rx="14" fill={NAVY_LIGHT} />
        <path d="M70 92 l8 18 12 -18 z" fill={NAVY_LIGHT} />
        {[50, 64].map((y) => (
          <rect key={y} x="40" y={y} width="86" height="7" rx="3.5" fill={SKY} opacity="0.9" />
        ))}
      </g>
      <g>
        <rect x="218" y="34" width="118" height="58" rx="14" fill={ROSE} />
        <path d="M290 92 l-8 18 -12 -18 z" fill={ROSE} />
        {[50, 64].map((y) => (
          <rect key={y} x="234" y={y} width="86" height="7" rx="3.5" fill={SKY} opacity="0.9" />
        ))}
      </g>
      {/* Convergence arrows */}
      <path d="M104 108 q40 34 60 44" stroke={NAVY_LIGHT} strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M256 108 q-40 34 -60 44" stroke={ROSE} strokeWidth="7" strokeLinecap="round" fill="none" />
      {/* The compromise document */}
      <rect x="132" y="150" width="96" height="58" rx="7" fill={CREAM} stroke={PAPER_EDGE} strokeWidth="3" />
      {[162, 172].map((y) => (
        <rect key={y} x="144" y={y} width="72" height="5" rx="2.5" fill={GOLD_DEEP} opacity="0.5" />
      ))}
      <path d="M148 194 l8 8 18 -16" stroke={GREEN} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="206" cy="192" r="7" fill={ROSE} />
    </>
  ),

  /** One trunk, three branches — separation of powers as a growing tree. */
  'three-branches-seed': (
    <>
      <rect x="0" y="0" width="360" height="220" rx="16" fill={SKY} />
      {/* Ground + trunk */}
      <ellipse cx="180" cy="196" rx="120" ry="14" fill={GREEN} opacity="0.35" />
      <path d="M172 196 q-4 -60 8 -96 q8 36 8 96 z" fill={GOLD_DEEP} />
      {/* Three branches */}
      <path d="M180 118 q-52 -18 -76 -50" stroke={GOLD_DEEP} strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M180 104 q0 -34 0 -52" stroke={GOLD_DEEP} strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M180 118 q52 -18 76 -50" stroke={GOLD_DEEP} strokeWidth="9" strokeLinecap="round" fill="none" />
      {/* Canopies */}
      <circle cx="96" cy="58" r="34" fill={NAVY_LIGHT} />
      <circle cx="180" cy="40" r="34" fill={GREEN} />
      <circle cx="264" cy="58" r="34" fill={ROSE} />
      {/* Branch emblems: gavel dot, star, shield dot */}
      <circle cx="96" cy="58" r="9" fill={CREAM} />
      <path d="M180 30 l4 8 9 1 -6.5 6 1.5 9 -8 -4.5 -8 4.5 1.5 -9 -6.5 -6 9 -1 z" fill={CREAM} />
      <circle cx="264" cy="58" r="9" fill={CREAM} />
      {/* Roots labeled by the people */}
      {crowd(96, 206, [NAVY_LIGHT, GOLD, ROSE, GREEN, NAVY])}
    </>
  ),
}

export const ILLUSTRATIONS: Record<string, (props: { className?: string }) => JSX.Element> =
  Object.fromEntries(
    illustrationKeys.map((key) => [
      key,
      function IllustrationScene({ className = 'w-full' }: { className?: string }) {
        return (
          <svg
            viewBox="0 0 360 220"
            className={className}
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
          >
            {scenes[key]}
          </svg>
        )
      },
    ])
  )
