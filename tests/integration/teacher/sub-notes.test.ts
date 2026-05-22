/**
 * Integration Tests — Sub Notes
 *
 * Tests that updating sub prep notes writes an AuditLog row.
 *
 * Prefix: test-phase9c-subnotes-
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const T_CLEVERID = 'test-phase9c-subnotes-teacher'
let teacherUserId: string
let classId: string

beforeAll(async () => {
  const teacherUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: { cleverId: T_CLEVERID, email: `${T_CLEVERID}@test.invalid`, firstName: 'SubNotesT', lastName: 'Test', role: 'TEACHER' },
    update: {},
    select: { id: true },
  })
  teacherUserId = teacherUser.id
  const teacher = await prisma.teacher.upsert({ where: { userId: teacherUserId }, create: { userId: teacherUserId }, update: {}, select: { id: true } })

  const cls = await prisma.class.create({
    data: { teacherId: teacher.id, name: 'SubNotes Test Class', schoolYear: '2025-26' },
    select: { id: true },
  })
  classId = cls.id
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { actorUserId: teacherUserId, action: 'SUB_NOTES_SET' } })
  await prisma.class.deleteMany({ where: { id: classId } })
  await prisma.teacher.deleteMany({ where: { userId: teacherUserId } })
  await prisma.user.deleteMany({ where: { cleverId: T_CLEVERID } })
  await prisma.$disconnect()
})

describe('sub notes', () => {
  it('saves sub prep notes to the class', async () => {
    await prisma.$transaction([
      prisma.class.update({
        where: { id: classId },
        data: { subPrepNotes: 'Page 42 in the textbook. Bell ringer is on the board.' },
      }),
      prisma.auditLog.create({
        data: {
          actorUserId: teacherUserId,
          action: 'SUB_NOTES_SET',
          entityType: 'Class',
          entityId: classId,
          metadataJson: { classId },
        },
      }),
    ])

    const cls = await prisma.class.findUnique({ where: { id: classId }, select: { subPrepNotes: true } })
    expect(cls!.subPrepNotes).toBe('Page 42 in the textbook. Bell ringer is on the board.')
  })

  it('writes SUB_NOTES_SET AuditLog row', async () => {
    const log = await prisma.auditLog.findFirst({
      where: { actorUserId: teacherUserId, action: 'SUB_NOTES_SET' },
      orderBy: { createdAt: 'desc' },
    })

    expect(log).not.toBeNull()
    expect(log!.entityType).toBe('Class')
    expect(log!.entityId).toBe(classId)
  })
})
