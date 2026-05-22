/**
 * Benchmark class performance overview.
 *
 * Scoped to the teacher's enrolled students.
 */

import { prisma } from '@/lib/db'
import { resolveTeacherId, getTeacherRoster } from '@/lib/teacher-roster'

export interface BenchmarkOverview {
  benchmarkId: string
  benchmarkCode: string
  title: string
  reportingCategoryName: string
  classMasteryRatePercent: number
  averageScoreByAttempt: Array<{ attemptNumber: number; avgScore: number }>
  studentsInRemediationCount: number
}

export async function getBenchmarkClassPerformance(
  teacherUserId: string,
  benchmarkId: string
): Promise<BenchmarkOverview> {
  await resolveTeacherId(teacherUserId)
  const roster = await getTeacherRoster(teacherUserId)

  const benchmark = await prisma.benchmark.findUniqueOrThrow({
    where: { id: benchmarkId },
    select: {
      id: true,
      code: true,
      title: true,
      reportingCategory: { select: { name: true } },
    },
  })

  if (roster.allStudentIds.length === 0) {
    return {
      benchmarkId: benchmark.id,
      benchmarkCode: benchmark.code,
      title: benchmark.title,
      reportingCategoryName: benchmark.reportingCategory.name,
      classMasteryRatePercent: 0,
      averageScoreByAttempt: [],
      studentsInRemediationCount: 0,
    }
  }

  // Mastery rate
  const progressRows = await prisma.studentProgress.findMany({
    where: {
      studentId: { in: roster.allStudentIds },
      benchmarkId,
    },
    select: { status: true },
  })

  const totalStudents = progressRows.length
  const masteredCount = progressRows.filter((r) => r.status === 'MASTERED').length
  const classMasteryRatePercent =
    totalStudents === 0 ? 0 : Math.round((masteredCount / totalStudents) * 100)

  // Average score by attempt number — across assessments tied to this benchmark
  const assessments = await prisma.assessment.findMany({
    where: { benchmarkId },
    select: { id: true },
  })
  const assessmentIds = assessments.map((a) => a.id)

  const attempts = await prisma.assessmentAttempt.findMany({
    where: {
      studentId: { in: roster.allStudentIds },
      assessmentId: { in: assessmentIds },
      voided: false,
      submittedAt: { not: null },
      score: { not: null },
    },
    select: { attemptNumber: true, score: true },
    orderBy: { attemptNumber: 'asc' },
  })

  const byAttemptNum = new Map<number, { sum: number; count: number }>()
  for (const a of attempts) {
    if (a.score == null) continue
    const entry = byAttemptNum.get(a.attemptNumber) ?? { sum: 0, count: 0 }
    entry.sum += a.score
    entry.count++
    byAttemptNum.set(a.attemptNumber, entry)
  }

  const averageScoreByAttempt = Array.from(byAttemptNum.entries())
    .map(([attemptNumber, agg]) => ({
      attemptNumber,
      avgScore: agg.count === 0 ? 0 : Math.round((agg.sum / agg.count) * 100) / 100,
    }))
    .sort((a, b) => a.attemptNumber - b.attemptNumber)

  // Students in remediation for this benchmark
  const studentsInRemediation = await prisma.studentRemediation.findMany({
    where: {
      studentId: { in: roster.allStudentIds },
      benchmarkId,
      status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
    },
    select: { studentId: true },
    distinct: ['studentId'],
  })

  return {
    benchmarkId: benchmark.id,
    benchmarkCode: benchmark.code,
    title: benchmark.title,
    reportingCategoryName: benchmark.reportingCategory.name,
    classMasteryRatePercent,
    averageScoreByAttempt,
    studentsInRemediationCount: studentsInRemediation.length,
  }
}
