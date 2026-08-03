/**
 * Activity Sessions — public API.
 *
 * Cross-module imports go through this barrel (see CLAUDE.md repo structure).
 *
 * Records and reports when students are on the platform, how long they were
 * actually working, and what they accomplished in each stretch of work.
 * See docs/adrs/0019-student-activity-sessions.md.
 */

export {
  ACTIVITY_AREAS,
  ACTIVE_DELTA_CAP_SECONDS,
  AREA_LABELS,
  LIVE_IDLE_MINUTES,
  LIVE_ONLINE_MINUTES,
  PING_INTERVAL_SECONDS,
  SESSION_GAP_MINUTES,
  WRITE_DEBOUNCE_SECONDS,
  areaFromPathname,
  isActivityArea,
  type ActivityArea,
} from './config'

export {
  activeDelta,
  activeMinutes,
  addAreaSeconds,
  areaBreakdown,
  mergeAdjacentSessions,
  parseAreaSeconds,
  presenceState,
  secondsBetween,
  sessionSpanSeconds,
  shouldOpenNewSession,
  spanMinutes,
  sumAreaSeconds,
  type AreaSeconds,
  type PresenceState,
  type SessionLike,
} from './sessionize'

export {
  closeStaleSessions,
  touchActivity,
  touchActivitySafe,
  type TouchOptions,
  type TouchOutcome,
  type TouchResult,
} from './touch'

export {
  getClassSessionActivity,
  getLivePresence,
  getStudentSessionHistory,
  type ClassActivityReport,
  type DateRange,
  type LivePresence,
  type LivePresenceRow,
  type SessionProgress,
  type SessionRow,
  type StudentActivitySummary,
} from './report'
