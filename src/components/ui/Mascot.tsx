/**
 * The Founder — the My Civics Class mascot: a friendly bald eagle in a tricorn hat.
 * Pure inline SVG (no assets), safe in server and client components.
 *
 * Decorative by default (aria-hidden). Pass `title` when the mascot is the
 * only content conveying meaning.
 */

export type MascotPose = 'happy' | 'thinking' | 'celebrating' | 'pointing'

interface MascotProps {
  pose?: MascotPose
  className?: string
  title?: string
}

const NAVY = '#312e81' // indigo-900 — body
const NAVY_LIGHT = '#4338ca' // indigo-700 — chest shading
const NAVY_DEEP = '#1e1b4b' // indigo-950 — hat, wings
const CREAM = '#ffffff'
const GOLD = '#f59e0b'
const GOLD_DEEP = '#d97706'
const INK = '#1f2937'

export function Mascot({ pose = 'happy', className = 'h-16 w-16', title }: MascotProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title && <title>{title}</title>}

      {/* Tail feathers (white, like a bald eagle's) */}
      <g fill={CREAM} stroke="#e5e7eb" strokeWidth="1">
        <rect x="47" y="99" width="7" height="15" rx="3.5" />
        <rect x="56.5" y="101" width="7" height="15" rx="3.5" />
        <rect x="66" y="99" width="7" height="15" rx="3.5" />
      </g>

      {/* Talons */}
      <ellipse cx="50" cy="110" rx="6" ry="4" fill={GOLD} />
      <ellipse cx="70" cy="110" rx="6" ry="4" fill={GOLD} />

      {/* Body — dark like a bald eagle's */}
      <ellipse cx="60" cy="86" rx="27" ry="24" fill={NAVY} />
      {/* Chest shading + feather ticks (no white belly — that reads penguin) */}
      <ellipse cx="60" cy="91" rx="16" ry="15" fill={NAVY_LIGHT} />
      <g stroke={NAVY} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.85">
        <path d="M54 86 q2 3 0 6" />
        <path d="M60 88 q2 3 0 6" />
        <path d="M66 86 q2 3 0 6" />
      </g>

      {/* Wings (pose-dependent) */}
      {pose === 'celebrating' ? (
        <g fill={NAVY_DEEP}>
          {/* Both wings thrown up */}
          <path d="M36 80 Q18 68 16 48 Q30 56 40 68 Q42 76 36 80 Z" />
          <path d="M84 80 Q102 68 104 48 Q90 56 80 68 Q78 76 84 80 Z" />
        </g>
      ) : pose === 'pointing' ? (
        <g fill={NAVY_DEEP}>
          {/* Left wing resting, right wing extended out */}
          <path d="M36 78 Q24 86 28 100 Q38 102 44 92 Q42 82 36 78 Z" />
          <path d="M82 78 Q100 72 112 74 Q112 82 100 86 Q88 88 82 86 Z" />
        </g>
      ) : pose === 'thinking' ? (
        <g fill={NAVY_DEEP}>
          {/* Left wing resting, right wing raised to chin */}
          <path d="M36 78 Q24 86 28 100 Q38 102 44 92 Q42 82 36 78 Z" />
          <path d="M84 82 Q94 78 92 66 Q82 62 76 70 Q76 78 84 82 Z" />
        </g>
      ) : (
        <g fill={NAVY_DEEP}>
          {/* Happy: both wings resting at sides */}
          <path d="M36 78 Q24 86 28 100 Q38 102 44 92 Q42 82 36 78 Z" />
          <path d="M84 78 Q96 86 92 100 Q82 102 76 92 Q78 82 84 78 Z" />
        </g>
      )}

      {/* White head (the bald-eagle signature) */}
      <circle cx="60" cy="50" r="24" fill={CREAM} stroke="#e5e7eb" strokeWidth="1.5" />
      {/* Neck-feather fringe where white head meets dark body */}
      <g fill={CREAM}>
        <path d="M40 66 l3.5 6 3.5-6 Z" />
        <path d="M49 69 l3.5 6 3.5-6 Z" />
        <path d="M64 69 l3.5 6 3.5-6 Z" />
        <path d="M73 66 l3.5 6 3.5-6 Z" />
      </g>

      {/* Brows — the friendly-fierce eagle look */}
      {pose === 'thinking' ? (
        <g stroke={GOLD_DEEP} strokeWidth="2.4" strokeLinecap="round" fill="none">
          <path d="M45 40 L54 42.5" />
          <path d="M75 37.5 L66 41" />
        </g>
      ) : (
        <g stroke={GOLD_DEEP} strokeWidth="2.4" strokeLinecap="round" fill="none">
          <path d="M45 40.5 L54 42.5" />
          <path d="M75 40.5 L66 42.5" />
        </g>
      )}

      {/* Eyes */}
      {pose === 'thinking' ? (
        <g>
          {/* Looking up */}
          <circle cx="52" cy="46.5" r="3.6" fill={INK} />
          <circle cx="67" cy="46.5" r="3.6" fill={INK} />
          <circle cx="51" cy="45.2" r="1.2" fill="#fff" />
          <circle cx="66" cy="45.2" r="1.2" fill="#fff" />
        </g>
      ) : (
        <g>
          <circle cx="52" cy="47.5" r="3.6" fill={INK} />
          <circle cx="68" cy="47.5" r="3.6" fill={INK} />
          <circle cx="53.2" cy="46.3" r="1.2" fill="#fff" />
          <circle cx="69.2" cy="46.3" r="1.2" fill="#fff" />
        </g>
      )}

      {/* Hooked raptor beak */}
      <path d="M52.5 52.5 Q60 50 67.5 52.5 Q66.5 62 60 66.5 Q53.5 62 52.5 52.5 Z" fill={GOLD} />
      <path d="M56.5 63.5 Q60 68.5 63.5 63.5 Q60 66.5 56.5 63.5 Z" fill={GOLD_DEEP} />
      {/* Beak smile crease */}
      {pose === 'celebrating' ? (
        <path d="M55 58 Q60 62.5 65 58" stroke={GOLD_DEEP} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M56 58.5 Q60 61.5 64 58.5" stroke={GOLD_DEEP} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      )}

      {/* Tricorn hat — three-point silhouette */}
      <g>
        {/* Crown */}
        <path d="M38 33 Q60 12 82 33 Q60 25 38 33 Z" fill={NAVY_DEEP} />
        {/* Brim: upswept side points, central dip */}
        <path d="M23 28 Q40 37 60 37 Q80 37 97 28 Q90 43 60 43 Q30 43 23 28 Z" fill={NAVY_DEEP} />
        {/* Gold trim along the brim */}
        <path d="M26 30.5 Q60 40 94 30.5" stroke={GOLD} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        {/* Cockade */}
        <circle cx="82" cy="33.5" r="4.5" fill="#ef4444" />
        <circle cx="82" cy="33.5" r="2.6" fill="#fff" />
        <circle cx="82" cy="33.5" r="1.1" fill="#3b82f6" />
      </g>

      {/* Pose extras */}
      {pose === 'celebrating' && (
        <g>
          <path d="M22 30 l2.2 4.6 4.8 0.8 -3.5 3.5 0.9 4.9 -4.4 -2.4 -4.4 2.4 0.9 -4.9 -3.5 -3.5 4.8 -0.8 Z" fill={GOLD} />
          <path d="M100 22 l1.8 3.8 4 0.7 -2.9 2.9 0.7 4 -3.6 -2 -3.6 2 0.7 -4 -2.9 -2.9 4 -0.7 Z" fill="#f43f5e" />
          <circle cx="18" cy="58" r="3" fill="#38bdf8" />
          <circle cx="103" cy="46" r="2.5" fill="#a78bfa" />
        </g>
      )}
      {pose === 'thinking' && (
        <g fill="#c7d2fe">
          <circle cx="92" cy="40" r="2.5" />
          <circle cx="98" cy="31" r="3.5" />
          <circle cx="106" cy="20" r="4.5" />
        </g>
      )}
    </svg>
  )
}
