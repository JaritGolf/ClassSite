/**
 * Integration Tests — Spaced Retrieval Reprime
 *
 * Tests that the reprime action writes an AuditLog row.
 *
 * Prefix: test-phase9c-reprime-
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const T_CLEVERID = 'test-phase9c-reprime-teacher'
let teacherUserId: string

beforeAll(async () => {
  const teacherUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: { cleverId: T_CLEVERID, email: `${T_CLEVERID}@test.invalid`, firstName: 'ReprimeT', lastName: 'Test', role: 'TEACHER' },
    update: {},
    select: { id: true },
  })
  teacherUserId = teacherUser.id
  await prisma.teacher.upsert({ where: { userId: teacherUserId }, create: { userId: teacherUserId }, update: {} })
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { actorUserId: teacherUserId, action: 'TRIGGER_CLASS_REPRIMING' } })
  await prisma.teacher.deleteMany({ where: { userId: teacherUserId } })
  await prisma.user.deleteMany({ where: { cleverId: T_CLEVERID } })
  await prisma.$disconnect()
})

describe('class reprime', () => {
  it('writes TRIGGER_CLASS_REPRIMING AuditLog row', async () => {
    const classId = 'test-class-reprime-1'

    const log = await prisma.auditLog.create({
      data: {
        actorUserId: teacherUserId,
        action: 'TRIGGER_CLASS_REPRIMING',
        entityType: 'Class',
        entityId: classId,
        metadataJson: { classId, benchmarkId: null, note: 'Interval-halving deferred to Phase 10' },
      },
      select: { id: true },
    })

    const saved = await prisma.auditLog.findUnique({ where: { id: log.id } })
    expect(saved!.action).toBe('TRIGGER_CLASS_REPRIMING')
    expect((saved!.metadataJson as { note: string }).note).toMatch(/Phase 10/)
  })
})
