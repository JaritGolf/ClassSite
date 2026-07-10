/**
 * Demo Seed — Hero Student Mastery Distribution
 *
 * Drives the mock-auth-linked "hero" student (Alex Student) through a
 * realistic Unit 1 progress distribution using the real assessment/mastery
 * engines. Benchmark unlocking is strictly sequential in the real engine
 * (unlockNextBenchmark only fires on MASTERED/EXPOSURE_COMPLETE), so the
 * reachable distribution is:
 *
 *   benchmark 1  → MASTERED               (unlocks benchmark 2)
 *   benchmark 2  → MASTERED               (unlocks benchmark 3)
 *   benchmark 3  → NEEDS_REMEDIATION       (failed mastery attempt; does not
 *                                           unlock benchmark 4 — this is the
 *                                           real engine's behavior, not a
 *                                           shortcut)
 *   benchmarks 4-6 → locked (no StudentProgress row — genuinely unreachable
 *                    through the real UI at this point, so left untouched)
 */

import { prisma } from '@/lib/db'
import { bulkApproveByTag } from '@/lib/content-approval'
import { completeRemediation } from '@/lib/remediation'
import {
  driveAttempt,
  findAssessment,
  getBenchmarkProgressStatus,
  loadBenchmarksByCode,
  UNIT1_BENCHMARK_CODES,
} from './engine-helpers'

export async function seedHeroProgress(heroStudentId: string, teacherUserId: string): Promise<string> {
  const [bm1, bm2, bm3] = await loadBenchmarksByCode(UNIT1_BENCHMARK_CODES.slice(0, 3))

  await masterBenchmark(heroStudentId, bm1.id, bm1.code)
  await masterBenchmark(heroStudentId, bm2.id, bm2.code)
  await failIntoRemediation(heroStudentId, bm3.id, bm3.code, teacherUserId)

  return (
    `${bm1.code} & ${bm2.code} MASTERED, ${bm3.code} NEEDS_REMEDIATION, ` +
    `${UNIT1_BENCHMARK_CODES.length - 3} further Unit 1 benchmark(s) locked`
  )
}

async function masterBenchmark(studentId: string, benchmarkId: string, code: string): Promise<void> {
  const status = await getBenchmarkProgressStatus(studentId, benchmarkId)
  if (status === 'MASTERED') return

  const readiness = await findAssessment(benchmarkId, 'READINESS_CHECK')
  if (readiness) await driveAttempt(readiness.id, studentId, 999)

  const mastery = await findAssessment(benchmarkId, 'MASTERY_CHALLENGE')
  if (!mastery) throw new Error(`No MASTERY_CHALLENGE assessment found for ${code}`)
  await driveAttempt(mastery.id, studentId, 999, 2) // all correct, confidence="Very sure"
}

async function failIntoRemediation(
  studentId: string,
  benchmarkId: string,
  code: string,
  teacherUserId: string
): Promise<void> {
  const status = await getBenchmarkProgressStatus(studentId, benchmarkId)

  if (status === null || status === 'NOT_STARTED') {
    // Deliberate, scoped exception: seeded RemediationItems default to
    // NEEDS_REVIEW (Trust Tier C) and assignRemediation() only ever matches
    // APPROVED items. Bulk-approve just this benchmark's remediation content
    // — mirrors the real /teacher/content bulk-approve action — so the
    // remediation engine actually has something to assign below.
    await bulkApproveByTag(teacherUserId, { entityType: 'REMEDIATION_ITEM', benchmarkId })

    const readiness = await findAssessment(benchmarkId, 'READINESS_CHECK')
    if (readiness) await driveAttempt(readiness.id, studentId, 999)

    const mastery = await findAssessment(benchmarkId, 'MASTERY_CHALLENGE')
    if (!mastery) throw new Error(`No MASTERY_CHALLENGE assessment found for ${code}`)
    // All wrong, confidence=0 ("Not sure") — routes to BASIC_RETEACH/MINI_LESSON_REPLAY,
    // not MISCONCEPTION_FIX (confidence=2), since no MISCONCEPTION_FIX-typed
    // RemediationItem is ever seeded (see seed/remediation_items.ts).
    await driveAttempt(mastery.id, studentId, 0, 0)
  }

  // Leave one remediation ASSIGNED and complete another, if there are at
  // least two — showing both states in the student/teacher UI at once.
  const assignedRows = await prisma.studentRemediation.findMany({
    where: { studentId, benchmarkId, status: 'ASSIGNED' },
    select: { id: true },
  })
  if (assignedRows.length >= 2) {
    await completeRemediation(assignedRows[0].id, studentId).catch(() => {
      /* already completed on a prior run — fine */
    })
  }
}
