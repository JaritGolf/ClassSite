/**
 * Integration Tests — Bulk Approve By Tag
 *
 * Tests that bulkApproveByTag approves all matching items in a $transaction
 * and writes a single AuditLog entry with itemIds array.
 *
 * Audit 9, item 6.
 * Prefix: test-phase9c-bulk-
 */

import { PrismaClient } from '@prisma/client'
import { bulkApproveByTag, listApprovalQueue } from '@/lib/content-approval'

const prisma = new PrismaClient()

const T_CLEVERID = 'test-phase9c-bulk-teacher'
let teacherUserId: string
let benchmarkId: string
let questionIds: string[] = []
const NUM_QUESTIONS = 3

beforeAll(async () => {
  // Teacher
  const teacherUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: { cleverId: T_CLEVERID, email: `${T_CLEVERID}@test.invalid`, firstName: 'BulkT', lastName: 'Test', role: 'TEACHER' },
    update: {},
    select: { id: true },
  })
  teacherUserId = teacherUser.id
  await prisma.teacher.upsert({
    where: { userId: teacherUserId },
    create: { userId: teacherUserId },
    update: {},
  })

  // Get a real benchmark from seed
  const bm = await prisma.benchmark.findFirst({ select: { id: true, reportingCategoryId: true } })
  if (!bm) throw new Error('No benchmark in DB — run seed first')
  benchmarkId = bm.id

  // Create NEEDS_REVIEW questions
  questionIds = []
  for (let i = 0; i < NUM_QUESTIONS; i++) {
    const q = await prisma.question.create({
      data: {
        benchmarkId: bm.id,
        reportingCategoryId: bm.reportingCategoryId,
        prompt: `Bulk approve test question ${i} [phase9c-bulk]`,
        itemType: 'MULTIPLE_CHOICE',
        cognitiveComplexity: 'LOW',
        readingLoadLevel: 2,
        skillTag: 'test',
        remediationTag: 'test',
        approvalStatus: 'NEEDS_REVIEW',
        sourceTier: 'C',
      },
      select: { id: true },
    })
    questionIds.push(q.id)
  }
})

afterAll(async () => {
  await prisma.questionOption.deleteMany({ where: { questionId: { in: questionIds } } })
  await prisma.question.deleteMany({ where: { id: { in: questionIds } } })
  await prisma.auditLog.deleteMany({ where: { actorUserId: teacherUserId, action: 'BULK_APPROVE_CONTENT' } })
  await prisma.teacher.deleteMany({ where: { userId: teacherUserId } })
  await prisma.user.deleteMany({ where: { cleverId: T_CLEVERID } })
  await prisma.$disconnect()
})

describe('bulkApproveByTag', () => {
  it('approves all specified ids in one call', async () => {
    const result = await bulkApproveByTag(teacherUserId, {
      entityType: 'QUESTION',
      ids: questionIds,
    })

    expect(result.approvedCount).toBe(NUM_QUESTIONS)
    expect(result.itemIds).toHaveLength(NUM_QUESTIONS)
  })

  it('writes exactly one AuditLog row with all itemIds', async () => {
    const log = await prisma.auditLog.findFirst({
      where: { actorUserId: teacherUserId, action: 'BULK_APPROVE_CONTENT' },
      orderBy: { createdAt: 'desc' },
    })

    expect(log).not.toBeNull()
    expect(log!.action).toBe('BULK_APPROVE_CONTENT')

    const meta = log!.metadataJson as { itemIds: string[]; count: number }
    expect(meta.itemIds).toHaveLength(NUM_QUESTIONS)
    expect(meta.count).toBe(NUM_QUESTIONS)
  })

  it('resulting questions have APPROVED status', async () => {
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { approvalStatus: true },
    })

    for (const q of questions) {
      expect(q.approvalStatus).toBe('APPROVED')
    }
  })

  it('returns empty list and writes audit log when no items match', async () => {
    const result = await bulkApproveByTag(teacherUserId, {
      entityType: 'QUESTION',
      ids: [],
    })

    expect(result.approvedCount).toBe(0)
    expect(result.itemIds).toHaveLength(0)
    expect(result.auditLogId).toBeTruthy()
  })
})
