/**
 * Report CSV builders (Phase 17, audit §36.18 item 2)
 *
 * Composes the existing analytics functions into flat, downloadable CSVs for
 * student, class, and EOC-readiness reports.
 *
 * PRIVACY ALLOWLIST: every column here is an aggregate progress/readiness
 * metric. These builders deliberately never touch question options, isCorrect,
 * feedback, or item-level distractor data (non-negotiable rules #2, spec §25.2).
 * The forbidden-field guard test (audit17/02) enforces this.
 */

import {
  computeStudentReadiness,
  computeClassReadiness,
} from '@/lib/eoc-analytics'
import {
  getClassMasteryByBenchmark,
  getClassMasteryByReportingCategory,
} from '@/lib/class-analytics'
import { toCsv, type CsvColumn } from './csv'

export interface BuiltReport {
  filename: string
  csv: string
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10)
}

// ── Student report ───────────────────────────────────────────────────────────

interface StudentReportRow {
  reportingCategory: string
  weight: number
  benchmarksMastered: number
  benchmarksTotal: number
  readinessPercent: string
  readinessLow: string
  readinessHigh: string
}

/**
 * Per-student EOC readiness by reporting category, plus an overall summary row.
 */
export async function buildStudentReportCsv(studentId: string): Promise<BuiltReport> {
  const readiness = await computeStudentReadiness(studentId)

  const rows: StudentReportRow[] = readiness.byCategory.map((c) => ({
    reportingCategory: c.name,
    weight: c.weight,
    benchmarksMastered: c.masteredCount,
    benchmarksTotal: c.totalBenchmarks,
    readinessPercent: c.readinessPercent.toFixed(1),
    readinessLow: c.readinessLow.toFixed(1),
    readinessHigh: c.readinessHigh.toFixed(1),
  }))

  rows.push({
    reportingCategory: 'OVERALL (weighted)',
    weight: 1,
    benchmarksMastered: readiness.byCategory.reduce((s, c) => s + c.masteredCount, 0),
    benchmarksTotal: readiness.byCategory.reduce((s, c) => s + c.totalBenchmarks, 0),
    readinessPercent: readiness.overallPercent.toFixed(1),
    readinessLow: readiness.overallLow.toFixed(1),
    readinessHigh: readiness.overallHigh.toFixed(1),
  })

  const columns: CsvColumn<StudentReportRow>[] = [
    { key: 'reportingCategory', header: 'Reporting Category' },
    { key: 'weight', header: 'Blueprint Weight' },
    { key: 'benchmarksMastered', header: 'Benchmarks Mastered' },
    { key: 'benchmarksTotal', header: 'Benchmarks Total' },
    { key: 'readinessPercent', header: 'Readiness %' },
    { key: 'readinessLow', header: 'Readiness CI Low' },
    { key: 'readinessHigh', header: 'Readiness CI High' },
  ]

  return {
    filename: `student-report-${studentId}-${stamp()}.csv`,
    csv: toCsv(rows, columns),
  }
}

// ── Class report ─────────────────────────────────────────────────────────────

interface ClassReportRow {
  benchmarkCode: string
  title: string
  reportingCategory: string
  masteryRatePercent: string
  masteredCount: number
  totalStudents: number
}

/**
 * Class mastery by benchmark, with reporting-category labels merged in.
 */
export async function buildClassReportCsv(teacherUserId: string): Promise<BuiltReport> {
  const [byBenchmark, byCategory] = await Promise.all([
    getClassMasteryByBenchmark(teacherUserId),
    getClassMasteryByReportingCategory(teacherUserId),
  ])

  const categoryName = new Map(byCategory.map((c) => [c.reportingCategoryId, c.name]))

  const rows: ClassReportRow[] = byBenchmark.map((b) => ({
    benchmarkCode: b.benchmarkCode,
    title: b.title,
    reportingCategory: categoryName.get(b.reportingCategoryId) ?? '',
    masteryRatePercent: b.masteryRatePercent.toFixed(1),
    masteredCount: b.masteredCount,
    totalStudents: b.totalStudents,
  }))

  const columns: CsvColumn<ClassReportRow>[] = [
    { key: 'benchmarkCode', header: 'Benchmark' },
    { key: 'title', header: 'Title' },
    { key: 'reportingCategory', header: 'Reporting Category' },
    { key: 'masteryRatePercent', header: 'Mastery Rate %' },
    { key: 'masteredCount', header: 'Students Mastered' },
    { key: 'totalStudents', header: 'Students Total' },
  ]

  return {
    filename: `class-report-${stamp()}.csv`,
    csv: toCsv(rows, columns),
  }
}

// ── EOC readiness report ─────────────────────────────────────────────────────

interface EocReadinessRow {
  reportingCategory: string
  weight: number
  readinessPercent: string
  studentCount: number
}

/**
 * Class-level EOC readiness by reporting category.
 */
export async function buildEocReadinessReportCsv(classId: string): Promise<BuiltReport> {
  const readiness = await computeClassReadiness(classId)

  const rows: EocReadinessRow[] = readiness.byCategory.map((c) => ({
    reportingCategory: c.name,
    weight: c.weight,
    readinessPercent: c.readinessPercent.toFixed(1),
    studentCount: readiness.studentCount,
  }))

  rows.push({
    reportingCategory: 'OVERALL (weighted)',
    weight: 1,
    readinessPercent: readiness.overallPercent.toFixed(1),
    studentCount: readiness.studentCount,
  })

  const columns: CsvColumn<EocReadinessRow>[] = [
    { key: 'reportingCategory', header: 'Reporting Category' },
    { key: 'weight', header: 'Blueprint Weight' },
    { key: 'readinessPercent', header: 'Readiness %' },
    { key: 'studentCount', header: 'Students' },
  ]

  return {
    filename: `eoc-readiness-${classId}-${stamp()}.csv`,
    csv: toCsv(rows, columns),
  }
}
