/**
 * Integration Tests — Approve Content
 *
 * Tests that approveContent sets approvalStatus=APPROVED
 * and writes an AuditLog row.
 *
 * Prefix: test-phase9c-approve-
 */

import { PrismaClient } from '@prisma/client'
import { approveContent } from '@/lib/content-approval'

const prisma = new PrismaClient()

const T_CLEVERID = 'test-phase9c-approve-teacher'
let teacherUserId: string
let questionId: string
let benchmarkId: string

beforeAll(async () => {
  const teacherUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: { cleverId: T_CLEVERID, email: `${T_CLEVERID}@test.invalid`, firstName: 'ApproveT', lastName: 'Test', role: 'TEACHER' },
    update: {},
    select: { id: true },
  })
  teacherUserId = teacherUser.id
  await prisma.teacher.upsert({ where: { userId: teacherUserId }, create: { userId: teacherUserId }, update: {} })

  const bm = await prisma.benchmark.findFirst({ select: { id: true, reportingCategoryId: true } })
  if (!bm) throw new Error('No benchmark in DB')
  benchmarkId = bm.id

  const q = await prisma.question.create({
    data: {
      benchmarkId: bm.id, reportingCategoryId: bm.reportingCategoryId,
      prompt: 'Approve content test question [phase9c-approve]',
      itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW',
      readingLoadLevel: 2, skillTag: 'test', remediationTag: 'test',
      approvalStatus: 'NEEDS_REVIEW', sourceTier: 'C',
    },
    select: { id: true },
  })
  questionId = q.id
})

afterAll(async () => {
  await prisma.questionOption.deleteMany({ where: { questionId } })
  await prisma.question.deleteMany({ where: { id: questionId } })
  await prisma.auditLog.deleteMany({ where: { actorUserId: teacherUserId, action: 'APPROVE_CONTENT' } })
  await prisma.teacher.deleteMany({ where: { userId: teacherUserId } })
  await prisma.user.deleteMany({ where: { cleverId: T_CLEVERID } })
  await prisma.$disconnect()
})

describe('approveContent', () => {
  it('sets approvalStatus to APPROVED', async () => {
    await approveContent(teacherUserId, 'QUESTION', questionId)

    const q = await prisma.question.findUnique({ where: { id: questionId }, select: { approvalStatus: true } })
    expect(q!.approvalStatus).toBe('APPROVED')
  })

  it('writes an AuditLog row with action=APPROVE_CONTENT', async () => {
    const log = await prisma.auditLog.findFirst({
      where: { actorUserId: teacherUserId, action: 'APPROVE_CONTENT' },
      orderBy: { createdAt: 'desc' },
    })
    expect(log).not.toBeNull()
    expect(log!.entityType).toBe('QUESTION')
    expect(log!.entityId).toBe(questionId)
  })

  it('returns the auditLogId', async () => {
    // Create a second NEEDS_REVIEW question for a fresh approval
    const q2 = await prisma.question.create({
      data: {
        benchmarkId, reportingCategoryId: (await prisma.benchmark.findUnique({ where: { id: benchmarkId }, select: { reportingCategoryId: true } }))!.reportingCategoryId,
        prompt: 'Approve content test question 2 [phase9c-approve]',
        itemType: 'MULTIPLE_CHOICE', cognitiveComplexity: 'LOW',
        readingLoadLevel: 2, skillTag: 'test', remediationTag: 'test',
        approvalStatus: 'NEEDS_REVIEW', sourceTier: 'C',
      },
      select: { id: true },
    })

    const result = await approveContent(teacherUserId, 'QUESTION', q2.id)
    expect(result.auditLogId).toBeTruthy()

    await prisma.questionOption.deleteMany({ where: { questionId: q2.id } })
    await prisma.question.deleteMany({ where: { id: q2.id } })
  })
})
