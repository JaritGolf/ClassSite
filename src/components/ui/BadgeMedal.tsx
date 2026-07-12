/**
 * Parametric SVG badge medallion — ribbon + ringed medal + icon glyph.
 * Earned medals render in full track color; unearned render desaturated with
 * a dashed ring ("keep going" silhouette). Decorative: pair with visible text.
 */

export type MedalColor = 'indigo' | 'amber' | 'green' | 'sky' | 'purple' | 'rose'
export type MedalIcon = 'star' | 'flame' | 'book' | 'shield' | 'bolt' | 'check' | 'medal'

interface BadgeMedalProps {
  color?: MedalColor
  icon?: MedalIcon
  earned?: boolean
  className?: string
}

const SHADES: Record<MedalColor, { main: string; dark: string; light: string }> = {
  indigo: { main: '#4f46e5', dark: '#3730a3', light: '#a5b4fc' },
  amber: { main: '#f59e0b', dark: '#b45309', light: '#fcd34d' },
  green: { main: '#22c55e', dark: '#15803d', light: '#86efac' },
  sky: { main: '#0ea5e9', dark: '#0369a1', light: '#7dd3fc' },
  purple: { main: '#a855f7', dark: '#7e22ce', light: '#d8b4fe' },
  rose: { main: '#f43f5e', dark: '#be123c', light: '#fda4af' },
}

const LOCKED = { main: '#d1d5db', dark: '#9ca3af', light: '#f3f4f6' }

function Glyph({ icon, fill }: { icon: MedalIcon; fill: string }) {
  switch (icon) {
    case 'star':
      return (
        <path
          d="M50 34l4.6 9.6 10.4 1.5-7.5 7.4 1.8 10.4L50 58l-9.3 4.9 1.8-10.4-7.5-7.4 10.4-1.5L50 34z"
          fill={fill}
        />
      )
    case 'flame':
      return (
        <path
          d="M50 33s9 8 9 16.5A9 9 0 0141 49.5c0-3.6 1.8-6.3 3.6-9 .9 3.6 2.7 4.8 2.7 4.8S50 38.4 50 33z"
          fill={fill}
        />
      )
    case 'book':
      return (
        <g fill="none" stroke={fill} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M50 40c-3-2.6-7.5-3.4-12-3.4v22c4.5 0 9 .8 12 3.4 3-2.6 7.5-3.4 12-3.4v-22c-4.5 0-9 .8-12 3.4z" />
          <path d="M50 40v22" />
        </g>
      )
    case 'shield':
      return (
        <path
          d="M50 32l13 5v9.5c0 9-6.5 14.5-13 18-6.5-3.5-13-9-13-18V37l13-5z"
          fill={fill}
        />
      )
    case 'bolt':
      return <path d="M53.5 31L39 52h9l-2.5 17L61 46h-9l1.5-15z" fill={fill} />
    case 'check':
      return (
        <path
          d="M39 50.5l7.5 7.5L62 41"
          fill="none"
          stroke={fill}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )
    case 'medal':
    default:
      return (
        <g fill={fill}>
          <circle cx="50" cy="50" r="7" />
          <path d="M50 36l2.4 4.9 5.4.8-3.9 3.8.9 5.4L50 48.4l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8L50 36z" opacity="0" />
        </g>
      )
  }
}

/** Map seed badge iconKeys (heroicon-style names) to medal color + glyph. */
const ICON_KEY_MEDALS: Record<string, { color: MedalColor; icon: MedalIcon }> = {
  // Mastery track
  star: { color: 'indigo', icon: 'star' },
  trophy: { color: 'amber', icon: 'star' },
  'shield-check': { color: 'indigo', icon: 'shield' },
  flag: { color: 'indigo', icon: 'star' },
  pillar: { color: 'indigo', icon: 'shield' },
  building: { color: 'indigo', icon: 'shield' },
  gavel: { color: 'indigo', icon: 'check' },
  scale: { color: 'indigo', icon: 'check' },
  organization: { color: 'indigo', icon: 'check' },
  // Reading track
  'book-open': { color: 'sky', icon: 'book' },
  'document-text': { color: 'sky', icon: 'book' },
  scroll: { color: 'sky', icon: 'book' },
  'magnifying-glass': { color: 'sky', icon: 'book' },
  eye: { color: 'sky', icon: 'book' },
  // Engagement track
  fire: { color: 'amber', icon: 'flame' },
  calendar: { color: 'amber', icon: 'flame' },
  'calendar-check': { color: 'amber', icon: 'check' },
  users: { color: 'amber', icon: 'flame' },
  'chat-bubble': { color: 'amber', icon: 'flame' },
  tree: { color: 'green', icon: 'flame' },
  // Strategy track
  'chess-knight': { color: 'purple', icon: 'bolt' },
  lightbulb: { color: 'purple', icon: 'bolt' },
  target: { color: 'purple', icon: 'star' },
  scissors: { color: 'purple', icon: 'bolt' },
  'arrows-right-left': { color: 'purple', icon: 'bolt' },
}

export function medalForIconKey(iconKey: string): { color: MedalColor; icon: MedalIcon } {
  return ICON_KEY_MEDALS[iconKey] ?? { color: 'indigo', icon: 'medal' }
}

export function BadgeMedal({
  color = 'indigo',
  icon = 'star',
  earned = true,
  className = 'h-16 w-16',
}: BadgeMedalProps) {
  const c = earned ? SHADES[color] : LOCKED

  return (
    <svg viewBox="0 0 100 120" className={className} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      {/* Ribbon tails */}
      <path d="M36 66l-11 40 17-9 4-25-10-6z" fill={c.dark} />
      <path d="M64 66l11 40-17-9-4-25 10-6z" fill={earned ? c.main : c.dark} opacity={earned ? 1 : 0.7} />

      {/* Medal */}
      <circle cx="50" cy="50" r="30" fill={c.main} />
      <circle
        cx="50"
        cy="50"
        r="30"
        fill="none"
        stroke={c.dark}
        strokeWidth="3"
        strokeDasharray={earned ? undefined : '5 4'}
      />
      <circle cx="50" cy="50" r="23" fill={earned ? c.dark : c.light} />
      <circle cx="50" cy="50" r="23" fill="none" stroke={c.light} strokeWidth="1.5" opacity="0.6" />

      <Glyph icon={icon} fill={earned ? '#ffffff' : '#9ca3af'} />

      {/* Shine */}
      {earned && <path d="M32 36a24 24 0 0110-8" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.45" />}
    </svg>
  )
}
