/**
 * Daily Class Report — public API
 *
 * A per-class, "open it each morning" report: the current status of every
 * student plus a prioritized plan of what to address for that class today.
 * Scoped to a single class and authorized via `assertClassOwnedByTeacher`.
 */

export { buildDailyClassReport } from './report'
export type {
  DailyClassReport,
  DailyStudentRow,
  DailyActionItem,
  DailyStatusSummary,
  DailyReadiness,
  DailyFlag,
  ActionCategory,
} from './report'
