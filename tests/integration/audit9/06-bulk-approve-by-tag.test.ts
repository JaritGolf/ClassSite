/**
 * Audit 9 Driver — Item 6: Bulk-approve-by-tag works and writes audit log
 *
 * Spec §36.10 item 6:
 *   Bulk-approve-by-tag works and writes audit log.
 *
 * Prefix: test-audit9-06-
 */

import { PrismaClient } from '@prisma/client'
import { bulkApproveByTag } from '@/lib/content-approval'

const prisma = new PrismaClient()

const T_CLEVERID = 'test-audit9-06-teacher'
let teacherUserId: string
let questionIds: string[] = []

beforeAll(async () => {
  const teacherUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: { cleverId: T_CLEVERID, email: `${T_CLEVERID}@test.invalid`, firstName: 'Audit906', lastName: 'Teacher', role: 'TEACHER' },
    update: {},
    select: { id: true },
  })
  teacherUserId = teacherUser.id
  await prisma.teacher.upsert({ where: { userId: teacherUserId }, create: { userId: teacherUserId }, update: {} })

  const bm = await prisma.benchmark.findFirst({ select: { id: true, reportingCategoryId: true } })
  if (!bm) throw new Error('No benchmark in DB')

  questionIds = []
  for (let i = 0; i < 2; i++) {
    const q = await prisma.question.create({
      data: {
        benchmarkId: bm.id, reportingCategoryId: bm.reportingCategoryId,
        prompt: `Audit9 item6 question ${i} [test-audit9-06]`,
        itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW',
        readingLoadLevel: 2, skillTag: 'test', remediationTag: 'test',
        approvalStatus: 'NEEDS_REVIEW', sourceTier: 'C',
      },
      select: { id: true },
    })
    questionIds.push(q.id)
  }
})

afterAll(async () => {
  await prisma.questionOption.deleteMany({ where: { questionId: { in: questionIds } } })
  await prisma.question.deleteMany({ where: { id: { in: questionIds } } })
  await prisma.auditLog.deleteMany({ where: { actorUserId: teacherUserId } })
  await prisma.teacher.deleteMany({ where: { userId: teacherUserId } })
  await prisma.user.deleteMany({ where: { cleverId: T_CLEVERID } })
  await prisma.$disconnect()
})

describe('Audit 9 — Item 6: Bulk-approve-by-tag', () => {
  it('approves all matching items', async () => {
    const result = await bulkApproveByTag(teacherUserId, {
      entityType: 'QUESTION',
      ids: questionIds,
    })

    expect(result.approvedCount).toBe(2)
    expect(result.itemIds).toEqual(expect.arrayContaining(questionIds))
  })

  it('writes a single AuditLog entry with action=BULK_APPROVE_CONTENT', async () => {
    const logs = await prisma.auditLog.findMany({
      where: { actorUserId: teacherUserId, action: 'BULK_APPROVE_CONTENT' },
    })

    expect(logs.length).toBeGreaterThanOrEqual(1)
    const log = logs[0]!
    expect(log.action).toBe('BULK_APPROVE_CONTENT')
  })

  it('AuditLog metadataJson.itemIds.length === approvedCount', async () => {
    const log = await prisma.auditLog.findFirst({
      where: { actorUserId: teacherUserId, action: 'BULK_APPROVE_CONTENT' },
      orderBy: { createdAt: 'desc' },
    })

    const meta = log!.metadataJson as { itemIds: string[]; count: number }
    expect(meta.itemIds.length).toBe(meta.count)
    expect(meta.count).toBe(2)
  })

  it('approved questions now have APPROVED status', async () => {
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { approvalStatus: true },
    })

    for (const q of questions) {
      expect(q.approvalStatus).toBe('APPROVED')
    }
  })
})
