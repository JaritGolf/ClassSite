/**
 * Assessment Integrity — public API.
 *
 * A web app cannot lock down a Chromebook; that belongs to the device
 * management layer (see docs/chromebook-lockdown.md for the GoGuardian /
 * ChromeOS kiosk runbook). This module is the app's honest counterpart: it
 * enforces what a browser can enforce, records what it cannot, and surfaces the
 * result to the teacher — never auto-punishing the student.
 *
 * See docs/adrs/0020-assessment-integrity-and-device-lockdown.md.
 */

export {
  isSecureAssessmentEnabled,
  resolveSecureModeForStudent,
  resolveSecureMode,
} from './secure-mode'

export {
  MAX_EVENTS_PER_ATTEMPT,
  IntegrityError,
  recordIntegrityEvents,
  getIntegrityEventsForAttempt,
  getIntegrityEventsByAttempt,
  type RecordIntegrityResult,
} from './events'

export {
  FOCUS_LOSS_EVENT_TYPES,
  BLOCKED_ACTION_EVENT_TYPES,
  NOTABLE_FOCUS_LOSS_COUNT,
  NOTABLE_TOTAL_AWAY_MS,
  NOTABLE_BLOCKED_ACTION_COUNT,
  NOTABLE_FULLSCREEN_EXIT_COUNT,
  summarizeIntegrityEvents,
  describeIntegritySummary,
  type IntegrityLevel,
  type IntegrityEventLike,
  type IntegritySummary,
} from './summary'
