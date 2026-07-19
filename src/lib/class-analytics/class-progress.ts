/**
 * Class mastery by benchmark, reporting category, and unit.
 */

import { prisma } from '@/lib/db'
import { getTeacherRoster } from '@/lib/teacher-roster'

export interface BenchmarkMasteryRow {
  benchmarkId: string
  benchmarkCode: string
  title: string
  masteryRatePercent: number
  masteredCount: number
  totalStudents: number
  reportingCategoryId: string
}

export async function getClassMasteryByBenchmark(
  teacherUserId: string
): Promise<BenchmarkMasteryRow[]> {
  const roster = await getTeacherRoster(teacherUserId)
  if (roster.allStudentIds.length === 0) return []

  const progressRows = await prisma.studentProgress.findMany({
    where: { studentId: { in: roster.allStudentIds } },
    select: {
      benchmarkId: true,
      status: true,
      benchmark: {
        select: { code: true, title: true, reportingCategoryId: true },
      },
    },
  })

  // Aggregate per benchmark
  const byBenchmark = new Map<
    string,
    {
      code: string
      title: string
      rcId: string
      total: number
      mastered: number
    }
  >()

  for (const row of progressRows) {
    const entry = byBenchmark.get(row.benchmarkId) ?? {
      code: row.benchmark.code,
      title: row.benchmark.title,
      rcId: row.benchmark.reportingCategoryId,
      total: 0,
      mastered: 0,
    }
    entry.total++
    if (row.status === 'MASTERED') entry.mastered++
    byBenchmark.set(row.benchmarkId, entry)
  }

  return Array.from(byBenchmark.entries()).map(([benchmarkId, agg]) => ({
    benchmarkId,
    benchmarkCode: agg.code,
    title: agg.title,
    masteryRatePercent:
      agg.total === 0 ? 0 : Math.round((agg.mastered / agg.total) * 100),
    masteredCount: agg.mastered,
    totalStudents: agg.total,
    reportingCategoryId: agg.rcId,
  }))
}

export interface ReportingCategoryMasteryRow {
  reportingCategoryId: string
  code: string
  name: string
  masteryRatePercent: number
  masteredCount: number
  totalAttempts: number
}

export async function getClassMasteryByReportingCategory(
  teacherUserId: string
): Promise<ReportingCategoryMasteryRow[]> {
  const roster = await getTeacherRoster(teacherUserId)
  if (roster.allStudentIds.length === 0) return []

  const progressRows = await prisma.studentProgress.findMany({
    where: { studentId: { in: roster.allStudentIds } },
    select: {
      status: true,
      benchmarkId: true,
      benchmark: {
        select: {
          reportingCategoryId: true,
          reportingCategory: { select: { name: true } },
        },
      },
    },
  })

  const byRC = new Map<
    string,
    { name: string; total: number; mastered: number }
  >()

  for (const row of progressRows) {
    const rcId = row.benchmark.reportingCategoryId
    const entry = byRC.get(rcId) ?? {
      name: row.benchmark.reportingCategory.name,
      total: 0,
      mastered: 0,
    }
    entry.total++
    if (row.status === 'MASTERED') entry.mastered++
    byRC.set(rcId, entry)
  }

  return Array.from(byRC.entries()).map(([rcId, agg]) => ({
    reportingCategoryId: rcId,
    // ReportingCategory has no code field; use name as the code
    code: agg.name,
    name: agg.name,
    masteryRatePercent:
      agg.total === 0 ? 0 : Math.round((agg.mastered / agg.total) * 100),
    masteredCount: agg.mastered,
    totalAttempts: agg.total,
  }))
}

export interface UnitMasteryRow {
  unitId: string
  sequenceOrder: number
  title: string
  benchmarkCount: number
  masteredBenchmarkCount: number
  progressPercent: number
}

export interface UnitBenchmarkRow {
  benchmarkId: string
  benchmarkCode: string
  title: string
  sequenceOrder: number
  masteredCount: number
  totalStudents: number
  masteryRatePercent: number
  /** False when no student in the roster has a StudentProgress row for this benchmark yet. */
  hasData: boolean
}

export interface UnitBenchmarkGroup {
  unitId: string
  unitTitle: string
  unitSequenceOrder: number
  gameRegionName: string
  benchmarks: UnitBenchmarkRow[]
}

/**
 * All benchmarks in every active unit, grouped by unit in curriculum order,
 * merged with the teacher's class mastery counts. Unlike getClassMasteryByBenchmark,
 * this never omits a benchmark just because no student has attempted it yet.
 */
export async function getBenchmarksGroupedByUnit(
  teacherUserId: string
): Promise<UnitBenchmarkGroup[]> {
  const roster = await getTeacherRoster(teacherUserId)

  const [units, progressRows] = await Promise.all([
    prisma.unit.findMany({
      where: { active: true },
      orderBy: { sequenceOrder: 'asc' },
      include: {
        benchmarks: {
          orderBy: { sequenceOrder: 'asc' },
          select: { id: true, code: true, title: true, sequenceOrder: true },
        },
      },
    }),
    roster.allStudentIds.length === 0
      ? Promise.resolve([])
      : prisma.studentProgress.findMany({
          where: { studentId: { in: roster.allStudentIds } },
          select: { benchmarkId: true, status: true },
        }),
  ])

  const byBenchmark = new Map<string, { total: number; mastered: number }>()
  for (const row of progressRows) {
    const entry = byBenchmark.get(row.benchmarkId) ?? { total: 0, mastered: 0 }
    entry.total++
    if (row.status === 'MASTERED') entry.mastered++
    byBenchmark.set(row.benchmarkId, entry)
  }

  return units.map((unit) => ({
    unitId: unit.id,
    unitTitle: unit.title,
    unitSequenceOrder: unit.sequenceOrder,
    gameRegionName: unit.gameRegionName,
    benchmarks: unit.benchmarks.map((b) => {
      const agg = byBenchmark.get(b.id)
      const totalStudents = agg?.total ?? 0
      const masteredCount = agg?.mastered ?? 0
      return {
        benchmarkId: b.id,
        benchmarkCode: b.code,
        title: b.title,
        sequenceOrder: b.sequenceOrder,
        masteredCount,
        totalStudents,
        masteryRatePercent:
          totalStudents === 0 ? 0 : Math.round((masteredCount / totalStudents) * 100),
        hasData: totalStudents > 0,
      }
    }),
  }))
}

export async function getClassMasteryByUnit(
  teacherUserId: string
): Promise<UnitMasteryRow[]> {
  const roster = await getTeacherRoster(teacherUserId)
  if (roster.allStudentIds.length === 0) return []

  // Get all student progress and their benchmark's unit
  const progressRows = await prisma.studentProgress.findMany({
    where: { studentId: { in: roster.allStudentIds } },
    select: {
      benchmarkId: true,
      status: true,
      benchmark: {
        select: {
          unitId: true,
          unit: { select: { title: true, sequenceOrder: true } },
        },
      },
    },
  })

  // Per unit: count unique benchmarks and how many are mastered across the class
  const byUnit = new Map<
    string,
    {
      title: string
      sequenceOrder: number
      benchmarkIds: Set<string>
      masteredBenchmarkIds: Set<string>
    }
  >()

  for (const row of progressRows) {
    const unitId = row.benchmark.unitId
    const entry = byUnit.get(unitId) ?? {
      title: row.benchmark.unit.title,
      sequenceOrder: row.benchmark.unit.sequenceOrder,
      benchmarkIds: new Set<string>(),
      masteredBenchmarkIds: new Set<string>(),
    }
    entry.benchmarkIds.add(row.benchmarkId)
    if (row.status === 'MASTERED') entry.masteredBenchmarkIds.add(row.benchmarkId)
    byUnit.set(unitId, entry)
  }

  return Array.from(byUnit.entries())
    .map(([unitId, agg]) => ({
      unitId,
      sequenceOrder: agg.sequenceOrder,
      title: agg.title,
      benchmarkCount: agg.benchmarkIds.size,
      masteredBenchmarkCount: agg.masteredBenchmarkIds.size,
      progressPercent:
        agg.benchmarkIds.size === 0
          ? 0
          : Math.round(
              (agg.masteredBenchmarkIds.size / agg.benchmarkIds.size) * 100
            ),
    }))
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
}
