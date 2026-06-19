import { PrismaClient } from '@prisma/client'

/**
 * Restore the mock users to a clean state after the e2e run.
 *
 * jest and the e2e suite share the dev database. Some jest suites (e.g.
 * tests/integration/auth.test.ts) wipe all `mock-*` users in teardown, which
 * fails with an FK violation if the mock student/teacher have accumulated
 * non-cascading child rows (assessment attempts, class enrollments, etc.) from
 * e2e navigation. This teardown removes those rows — and the mock users
 * themselves — so the suites stay independent in either run order.
 */
export default async function globalTeardown() {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
  })

  try {
    const userIds = (
      await prisma.user.findMany({
        where: { cleverId: { startsWith: 'mock-' } },
        select: { id: true },
      })
    ).map((u) => u.id)
    if (userIds.length === 0) return

    const studentIds = (
      await prisma.student.findMany({ where: { userId: { in: userIds } }, select: { id: true } })
    ).map((s) => s.id)
    const teacherIds = (
      await prisma.teacher.findMany({ where: { userId: { in: userIds } }, select: { id: true } })
    ).map((t) => t.id)

    // Assessment attempts have their own children (responses, adaptive state).
    const attemptIds = (
      await prisma.assessmentAttempt.findMany({
        where: { studentId: { in: studentIds } },
        select: { id: true },
      })
    ).map((a) => a.id)
    if (attemptIds.length) {
      await prisma.attemptResponse.deleteMany({ where: { attemptId: { in: attemptIds } } })
      await prisma.adaptiveSessionState.deleteMany({ where: { attemptId: { in: attemptIds } } })
    }

    // All non-cascading Student children.
    const studentChildModels = [
      'assessmentAttempt',
      'studentProgress',
      'spacedReviewState',
      'spacedReviewEvent',
      'studentRemediation',
      'classEnrollment',
      'studentBadge',
      'studentAccommodation',
      'eocReadinessSnapshot',
      'confidenceCalibrationSnapshot',
      'sourceDecoderProgress',
      'strategyTrackProgress',
      'streakState',
      'narrativeProgress',
      'studentUiSettings',
      'teacherOverride',
    ] as const
    for (const model of studentChildModels) {
      try {
        await (
          prisma as unknown as Record<string, { deleteMany: (a: unknown) => Promise<unknown> }>
        )[model].deleteMany({ where: { studentId: { in: studentIds } } })
      } catch {
        // model may not have a studentId column in some schema versions — ignore
      }
    }

    // Teacher-owned classes (+ enrollments).
    if (teacherIds.length) {
      const classIds = (
        await prisma.class.findMany({ where: { teacherId: { in: teacherIds } }, select: { id: true } })
      ).map((c) => c.id)
      if (classIds.length) {
        await prisma.classEnrollment.deleteMany({ where: { classId: { in: classIds } } })
        await prisma.class.deleteMany({ where: { id: { in: classIds } } })
      }
    }

    await prisma.student.deleteMany({ where: { id: { in: studentIds } } })
    await prisma.teacher.deleteMany({ where: { id: { in: teacherIds } } })
    await prisma.user.deleteMany({ where: { cleverId: { startsWith: 'mock-' } } })
  } finally {
    await prisma.$disconnect()
  }
}
