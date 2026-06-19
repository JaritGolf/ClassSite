/**
 * Data Retention — public API (Phase 17, audit §36.18 item 8)
 */

export {
  resolveRetentionConfig,
  parseRetentionDays,
  cutoffDate,
  DEFAULT_RETENTION_CONFIG,
} from './policy'
export type { RetentionConfig } from './policy'

export { purgeExpiredData } from './purge'
export type { PurgeOptions, PurgeResult } from './purge'
