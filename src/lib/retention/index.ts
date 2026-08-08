/**
 * Data Retention — public API (Phase 17, audit §36.18 item 8)
 *
 * Two distinct mechanisms live here:
 *   - purgeExpiredData        — ages rows out of shared tables (audit logs,
 *                               voided attempts, activity sessions, suggestions)
 *   - purgeDisenrolledStudents — deletes an individual student's records once the
 *                               Fla. Stat. § 1006.1494(3)(c) window has elapsed
 */

export {
  resolveRetentionConfig,
  resolveStudentRecordRetentionDays,
  parseRetentionDays,
  cutoffDate,
  DEFAULT_RETENTION_CONFIG,
  STATUTORY_MAX_STUDENT_RETENTION_DAYS,
} from './policy'
export type { RetentionConfig } from './policy'

export { purgeExpiredData } from './purge'
export type { PurgeOptions, PurgeResult } from './purge'

export {
  markStudentDisenrolled,
  findPurgeableStudents,
  purgeStudentRecords,
  purgeDisenrolledStudents,
} from './student-records'
export type { StudentPurgeCandidate, StudentPurgeResult } from './student-records'
