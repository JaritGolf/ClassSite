/**
 * Integration Tests — Archive Content
 *
 * Tests that archiveContent sets approvalStatus=ARCHIVED
 * and writes an AuditLog row with the reason.
 *
 * Prefix: test-phase9c-archive-
 */

import { PrismaClient } from '@prisma/client'
import { archiveContent } from '@/lib/content-approval'

const prisma = new PrismaClient()

const T_CLEVERID = 'test-phase9c-archive-teacher'
let teacherUserId: string
let questionId: string

beforeAll(async () => {
  const teacherUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: { cleverId: T_CLEVERID, email: `${T_CLEVERID}@test.invalid`, firstName: 'ArchiveT', lastName: 'Test', role: 'TEACHER' },
    update: {},
    select: { id: true },
  })
  teacherUserId = teacherUser.id
  await prisma.teacher.upsert({ where: { userId: teacherUserId }, create: { userId: teacherUserId }, update: {} })

  const bm = await prisma.benchmark.findFirst({ select: { id: true, reportingCategoryId: true } })
  if (!bm) throw new Error('No benchmark in DB')

  const q = await prisma.question.create({
    data: {
      benchmarkId: bm.id, reportingCategoryId: bm.reportingCategoryId,
      prompt: 'Archive content test question [phase9c-archive]',
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
  await prisma.auditLog.deleteMany({ where: { actorUserId: teacherUserId, action: 'ARCHIVE_CONTENT' } })
  await prisma.teacher.deleteMany({ where: { userId: teacherUserId } })
  await prisma.user.deleteMany({ where: { cleverId: T_CLEVERID } })
  await prisma.$disconnect()
})

describe('archiveContent', () => {
  it('sets approvalStatus to ARCHIVED', async () => {
    await archiveContent(teacherUserId, 'QUESTION', questionId, 'Duplicate content')

    const q = await prisma.question.findUnique({ where: { id: questionId }, select: { approvalStatus: true } })
    expect(q!.approvalStatus).toBe('ARCHIVED')
  })

  it('writes an AuditLog row with action=ARCHIVE_CONTENT', async () => {
    const log = await prisma.auditLog.findFirst({
      where: { actorUserId: teacherUserId, action: 'ARCHIVE_CONTENT' },
      orderBy: { createdAt: 'desc' },
    })
    expect(log).not.toBeNull()
    expect(log!.entityType).toBe('QUESTION')
    expect(log!.entityId).toBe(questionId)
  })

  it('stores the reason in metadataJson', async () => {
    const log = await prisma.auditLog.findFirst({
      where: { actorUserId: teacherUserId, action: 'ARCHIVE_CONTENT' },
      orderBy: { createdAt: 'desc' },
    })
    const meta = log!.metadataJson as { reason: string }
    expect(meta.reason).toBe('Duplicate content')
  })
})
