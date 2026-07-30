/**
 * Activity Sessions — tunables and the area vocabulary.
 *
 * Pure constants module (no DB, no I/O) so both the client heartbeat and the
 * server-side report can share one source of truth for the thresholds.
 */

/** How often the client heartbeat pings while a student is engaged. */
export const PING_INTERVAL_SECONDS = 60

/**
 * Upper bound on how much engaged time a single touch may contribute.
 *
 * This is what keeps "active time" honest. The heartbeat stops while the tab is
 * hidden or the student is idle, so when pings resume the elapsed gap may be
 * arbitrarily large — we credit at most this much. Set slightly above the ping
 * interval so a normal ping that arrives a little late still counts in full.
 */
export const ACTIVE_DELTA_CAP_SECONDS = 90

/** Touches closer together than this are dropped, to avoid write amplification. */
export const WRITE_DEBOUNCE_SECONDS = 10

/**
 * A gap longer than this between touches means the student walked away — the
 * next touch opens a NEW session rather than extending the old one.
 */
export const SESSION_GAP_MINUTES = 15

/** Last activity within this many minutes reads as "on now" in the live panel. */
export const LIVE_ONLINE_MINUTES = 2

/** Between LIVE_ONLINE_MINUTES and this, a student reads as "idle". */
export const LIVE_IDLE_MINUTES = 10

/**
 * Bucketed areas of the app. The client derives one of these from the current
 * pathname and sends only the bucket — raw paths are never transmitted or
 * stored, so no student-identifying route data lands in the activity record.
 */
export const ACTIVITY_AREAS = [
  'dashboard',
  'map',
  'mission',
  'assessment',
  'practice',
  'drill',
  'republic-challenge',
  'source-decoder',
  'strategy',
  'badges',
  'remediation',
  'settings',
  'other',
] as const

export type ActivityArea = (typeof ACTIVITY_AREAS)[number]

/** Human labels for the teacher-facing area breakdown. */
export const AREA_LABELS: Record<ActivityArea, string> = {
  dashboard: 'Dashboard',
  map: 'Mission Map',
  mission: 'Missions',
  assessment: 'Assessments',
  practice: 'Practice Arena',
  drill: 'Daily Drill',
  'republic-challenge': 'Republic Challenge',
  'source-decoder': 'Source Decoder',
  strategy: 'Strategist Track',
  badges: 'Badges',
  remediation: 'Review Activities',
  settings: 'Settings',
  other: 'Other',
}

export function isActivityArea(value: unknown): value is ActivityArea {
  return (
    typeof value === 'string' &&
    (ACTIVITY_AREAS as readonly string[]).includes(value)
  )
}

/**
 * Map a student-app pathname to its bucketed area.
 *
 * Shared by the client heartbeat (to pick what to send) and the server (to
 * validate). Unknown routes fall back to 'other' rather than erroring.
 */
export function areaFromPathname(pathname: string): ActivityArea {
  const segments = pathname.split('/').filter(Boolean)
  // Student routes are /student/<area>/...
  if (segments[0] !== 'student') return 'other'
  const candidate = segments[1]
  if (!candidate) return 'other'
  if (candidate === 'daily-drill') return 'drill'
  if (candidate === 'source-lab') return 'source-decoder'
  return isActivityArea(candidate) ? candidate : 'other'
}
