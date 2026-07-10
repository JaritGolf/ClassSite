/**
 * Demo Seed — Classmates Progress
 *
 * Gives the teacher's class roster real variety (not everyone mastered,
 * not everyone stuck) so class-level analytics (status distribution,
 * most-missed questions, misconceptions, small groups) have something to
 * show. Same real driveAttempt() engine helper as the hero student — no
 * parallel/hand-faked logic.
 *
 * classmateStudentIds is expected in the order seeded by people.ts:
 *   [0] Jordan Rivera, [1] Maya Chen, [2] Devon Brooks,
 *   [3] Sofia Ramirez, [4] Elijah Turner
 */

import { prisma } from '@/lib/db'
import { bulkApproveByTag } from '@/lib/content-approval'
import {
  driveAttempt,
  findAssessment,
  getBenchmarkProgressStatus,
  loadBenchmarksByCode,
  UNIT1_BENCHMARK_CODES,
} from './engine-helpers'

export async function seedClassmatesProgress(
  classmateStudentIds: string[],
  teacherUserId: string
): Promise<string[]> {
  const [bm1, bm2] = await loadBenchmarksByCode(UNIT1_BENCHMARK_CODES.slice(0, 2))
  const [jordan, maya, devon, sofia, elijah] = classmateStudentIds
  const summaries: string[] = []

  // Jordan Rivera — furthest along: both benchmarks mastered.
  await masterBenchmark(jordan, bm1.id)
  await masterBenchmark(jordan, bm2.id)
  summaries.push(`Jordan Rivera — ${bm1.code} & ${bm2.code} MASTERED`)

  // Maya Chen — mastered benchmark 1, now working through remediation on benchmark 2.
  await masterBenchmark(maya, bm1.id)
  await remediateBenchmark(maya, bm2.id, teacherUserId, 0, 1)
  summaries.push(`Maya Chen — ${bm1.code} MASTERED, ${bm2.code} NEEDS_REMEDIATION`)

  // Devon Brooks — only practiced benchmark 1, never attempted Mastery Challenge.
  await practiceOnly(devon, bm1.id)
  summaries.push(`Devon Brooks — ${bm1.code} practice attempt only, not started`)

  // Sofia Ramirez — struggling: two failed low-confidence attempts on benchmark 1.
  await remediateBenchmark(sofia, bm1.id, teacherUserId, 1, 2)
  summaries.push(`Sofia Ramirez — ${bm1.code} NEEDS_REMEDIATION (2 attempts)`)

  // Elijah Turner — simple case: benchmark 1 mastered, nothing further attempted.
  await masterBenchmark(elijah, bm1.id)
  summaries.push(`Elijah Turner — ${bm1.code} MASTERED`)

  return summaries
}

async function masterBenchmark(studentId: string, benchmarkId: string): Promise<void> {
  const status = await getBenchmarkProgressStatus(studentId, benchmarkId)
  if (status === 'MASTERED') return

  const readiness = await findAssessment(benchmarkId, 'READINESS_CHECK')
  if (readiness) await driveAttempt(readiness.id, studentId, 999)

  const mastery = await findAssessment(benchmarkId, 'MASTERY_CHALLENGE')
  if (!mastery) return
  await driveAttempt(mastery.id, studentId, 999, 2)
}

async function remediateBenchmark(
  studentId: string,
  benchmarkId: string,
  teacherUserId: string,
  confidence: 0 | 1,
  attempts: number
): Promise<void> {
  const status = await getBenchmarkProgressStatus(studentId, benchmarkId)
  if (status === 'NEEDS_REMEDIATION') return

  // Same deliberate exception as hero-progress.ts: NEEDS_REVIEW remediation
  // content must be approved before assignRemediation() can match it.
  await bulkApproveByTag(teacherUserId, { entityType: 'REMEDIATION_ITEM', benchmarkId })

  const mastery = await findAssessment(benchmarkId, 'MASTERY_CHALLENGE')
  if (!mastery) return
  for (let i = 0; i < attempts; i++) {
    await driveAttempt(mastery.id, studentId, 0, confidence)
  }
}

async function practiceOnly(studentId: string, benchmarkId: string): Promise<void> {
  const practice = await findAssessment(benchmarkId, 'PRACTICE')
  if (!practice) return

  const existingAttempts = await prisma.assessmentAttempt.count({
    where: { studentId, assessmentId: practice.id },
  })
  if (existingAttempts > 0) return

  await driveAttempt(practice.id, studentId, 3)
}
