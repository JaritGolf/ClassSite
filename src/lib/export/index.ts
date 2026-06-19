/**
 * Export — public API (Phase 17, District Readiness)
 *
 * Shared CSV serialization plus report builders for student / class /
 * EOC-readiness exports. PDF is handled in the UI via window.print()
 * (ADR 0008), so it is not represented here.
 */

export { toCsv, escapeCsvField, csvResponse } from './csv'
export type { CsvColumn } from './csv'

export {
  buildClassReportCsv,
  buildEocReadinessReportCsv,
  buildStudentReportCsv,
} from './reports'
