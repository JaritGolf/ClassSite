/**
 * Audit 17 — Item 8: Data retention policy is configurable and works.
 *  - dry-run reports eligible counts without deleting
 *  - apply deletes only rows past the threshold (children first)
 *  - the purge writes a RETENTION_PURGE audit log
 *  - recent / non-voided rows survive
 *
 * SAFETY: uses a deep-past (2013) timestamp with a 3650-day threshold so the
 * global purge only ever matches THIS test's rows, never other suites' data.
 * Prefix: test-audit17-03-
 */

import { PrismaClient } from '@prisma/client'
import { seedReportingCategories } from '../../../seed/reporting_categories'
import { seedBenchmarks } from '../../../seed/benchmarks'
import { purgeExpiredData } from '@/lib/retention'

const prisma = new PrismaClient()

const S_CLEVERID = 'test-audit17-03-student'
const ANCIENT = new Date('2013-01-01T00:00:00.000Z')
// activitySessionRetentionDays stays 0 (retain forever) so this suite's real
// purge run cannot touch activity-session rows belonging to other suites; that
// branch has its own coverage in tests/integration/activity-sessions.test.ts.
const CONFIG = {
  auditLogRetentionDays: 3650,
  voidedAttemptRetentionDays: 3650,
  activitySessionRetentionDays: 0,
}
const AUDIT_MARKER = 'TEST_AUDIT17_03_ANCIENT'

let studentId: string
let assessmentId: string
let questionId: string
let oldAttemptId: string
let recentAttemptId: string
let nonVoidedAttemptId: string
let ancientAuditId: string

beforeAll(async () => {
  await seedReportingCategories(prisma)
  await seedBenchmarks(prisma)
  const benchmark = await prisma.benchmark.findFirstOrThrow({ select: { id: true, reportingCategoryId: true } })

  const sUser = await prisma.user.upsert({
    where: { cleverId: S_CLEVERID },
    create: { cleverId: S_CLEVERID, email: `${S_CLEVERID}@test.invalid`, firstName: 'A17', lastName: '03Student', role: 'STUDENT' },
    update: {},
    select: { id: true },
  })
  const student = await prisma.student.upsert({ where: { userId: sUser.id }, create: { userId: sUser.id }, update: {}, select: { id: true } })
  studentId = student.id

  const question = await prisma.question.create({
    data: {
      benchmarkId: benchmark.id,
      reportingCategoryId: benchmark.reportingCategoryId,
      prompt: 'audit17-03 q',
      itemType: 'MULTIPLE_CHOICE',
      cognitiveComplexity: 'LOW',
      readingLoadLevel: 2,
      skillTag: 'audit17-03',
      remediationTag: 'audit17-03',
    },
    select: { id: true },
  })
  questionId = question.id

  const assessment = await prisma.assessment.create({
    data: { title: 'audit17-03', assessmentType: 'PRACTICE' },
    select: { id: true },
  })
  assessmentId = assessment.id

  // Old voided attempt WITH a response (exercises the FK-ordered delete).
  const oldAttempt = await prisma.assessmentAttempt.create({
    data: { assessmentId, studentId, attemptNumber: 1, voided: true, submittedAt: ANCIENT },
    select: { id: true },
  })
  oldAttemptId = oldAttempt.id
  await prisma.attemptResponse.create({
    data: { attemptId: oldAttemptId, questionId, responseJson: {}, isCorrect: false },
  })

  // Recent voided attempt — must survive (not past threshold).
  const recentAttempt = await prisma.assessmentAttempt.create({
    data: { assessmentId, studentId, attemptNumber: 2, voided: true, submittedAt: new Date() },
    select: { id: true },
  })
  recentAttemptId = recentAttempt.id

  // Old but NON-voided attempt — must survive (not voided).
  const nonVoided = await prisma.assessmentAttempt.create({
    data: { assessmentId, studentId, attemptNumber: 3, voided: false, submittedAt: ANCIENT },
    select: { id: true },
  })
  nonVoidedAttemptId = nonVoided.id

  // Ancient audit log — eligible; plus a recent one that survives.
  const ancient = await prisma.auditLog.create({
    data: { action: AUDIT_MARKER, entityType: 'Test', entityId: 'old', createdAt: ANCIENT },
    select: { id: true },
  })
  ancientAuditId = ancient.id
  await prisma.auditLog.create({ data: { action: AUDIT_MARKER, entityType: 'Test', entityId: 'new' } })
})

afterAll(async () => {
  await prisma.attemptResponse.deleteMany({ where: { questionId } })
  await prisma.assessmentAttempt.deleteMany({ where: { assessmentId } })
  await prisma.assessment.deleteMany({ where: { id: assessmentId } })
  await prisma.question.deleteMany({ where: { id: questionId } })
  await prisma.student.deleteMany({ where: { id: studentId } })
  await prisma.user.deleteMany({ where: { cleverId: S_CLEVERID } })
  await prisma.auditLog.deleteMany({ where: { action: AUDIT_MARKER } })
  await prisma.auditLog.deleteMany({ where: { action: 'RETENTION_PURGE', entityType: 'System' } })
  await prisma.$disconnect()
})

describe('Audit 17 — Item 8: retention purge', () => {
  it('dry-run reports eligible counts and deletes nothing', async () => {
    const result = await purgeExpiredData({ dryRun: true, config: CONFIG })
    expect(result.dryRun).toBe(true)
    expect(result.auditLogsDeleted).toBeGreaterThanOrEqual(1)
    expect(result.voidedAttemptsDeleted).toBeGreaterThanOrEqual(1)
    expect(result.attemptResponsesDeleted).toBeGreaterThanOrEqual(1)

    // Nothing actually deleted.
    expect(await prisma.assessmentAttempt.findUnique({ where: { id: oldAttemptId } })).not.toBeNull()
    expect(await prisma.auditLog.findUnique({ where: { id: ancientAuditId } })).not.toBeNull()
  })

  it('apply deletes only eligible rows and logs the purge', async () => {
    await purgeExpiredData({ dryRun: false, config: CONFIG, actorUserId: null })

    // Eligible rows gone.
    expect(await prisma.assessmentAttempt.findUnique({ where: { id: oldAttemptId } })).toBeNull()
    expect(await prisma.attemptResponse.findMany({ where: { attemptId: oldAttemptId } })).toHaveLength(0)
    expect(await prisma.auditLog.findUnique({ where: { id: ancientAuditId } })).toBeNull()

    // Survivors remain.
    expect(await prisma.assessmentAttempt.findUnique({ where: { id: recentAttemptId } })).not.toBeNull()
    expect(await prisma.assessmentAttempt.findUnique({ where: { id: nonVoidedAttemptId } })).not.toBeNull()

    // Purge itself recorded.
    const purgeLog = await prisma.auditLog.findFirst({
      where: { action: 'RETENTION_PURGE', entityType: 'System' },
      orderBy: { createdAt: 'desc' },
    })
    expect(purgeLog).not.toBeNull()
  })

  it('does nothing when thresholds are unset (retain forever)', async () => {
    const result = await purgeExpiredData({
      dryRun: true,
      config: {
        auditLogRetentionDays: 0,
        voidedAttemptRetentionDays: 0,
        activitySessionRetentionDays: 0,
      },
    })
    expect(result.auditLogsDeleted).toBe(0)
    expect(result.voidedAttemptsDeleted).toBe(0)
    expect(result.activitySessionsDeleted).toBe(0)
  })
})
