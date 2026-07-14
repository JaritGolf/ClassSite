/**
 * Test helper: satisfy the server-side readiness→mastery gate.
 *
 * startAttempt() refuses to start a MASTERY_CHALLENGE until the student has a
 * passed READINESS_CHECK attempt for the same benchmark (READINESS_REQUIRED).
 * Suites that start mastery attempts directly against seeded benchmarks call
 * this in beforeAll to record a passed readiness attempt (idempotent).
 *
 * The created attempt is scoped to the caller's test student, so the usual
 * "delete this student's attempts" afterAll cleanup removes it.
 */

import type { PrismaClient } from '@prisma/client'

export async function passReadinessCheck(
  prisma: PrismaClient,
  studentId: string,
  benchmarkId: string
): Promise<void> {
  const readiness = await prisma.assessment.findFirst({
    where: { benchmarkId, assessmentType: 'READINESS_CHECK' },
    select: { id: true },
  })
  if (!readiness) return // no readiness check configured — gate is exempt

  const existing = await prisma.assessmentAttempt.findFirst({
    where: { studentId, assessmentId: readiness.id, passed: true, voided: false },
    select: { id: true },
  })
  if (existing) return

  const count = await prisma.assessmentAttempt.count({
    where: { assessmentId: readiness.id, studentId },
  })
  await prisma.assessmentAttempt.create({
    data: {
      assessmentId: readiness.id,
      studentId,
      attemptNumber: count + 1,
      score: 1.0,
      passed: true,
      submittedAt: new Date(),
    },
  })
}
