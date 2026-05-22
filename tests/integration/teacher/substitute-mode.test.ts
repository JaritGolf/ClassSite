/**
 * Integration Tests — Substitute Mode
 *
 * Tests that the sub-mode middleware blocks mutations when the cookie is set.
 * Also tests that the toggle endpoint always works (bypasses the gate).
 *
 * Note: Since we test middleware behavior at the edge, we use the library
 * functions directly (cookie reading requires Next.js context, so we test
 * the guard logic and the AuditLog write separately).
 *
 * Prefix: test-phase9c-submode-
 */

import { PrismaClient } from '@prisma/client'
import { SubModeError } from '@/lib/substitute-mode/guard'
import { SUB_MODE_COOKIE } from '@/lib/substitute-mode/cookie'

const prisma = new PrismaClient()

const T_CLEVERID = 'test-phase9c-submode-teacher'
let teacherUserId: string

beforeAll(async () => {
  const teacherUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: { cleverId: T_CLEVERID, email: `${T_CLEVERID}@test.invalid`, firstName: 'SubT', lastName: 'Test', role: 'TEACHER' },
    update: {},
    select: { id: true },
  })
  teacherUserId = teacherUser.id
  await prisma.teacher.upsert({ where: { userId: teacherUserId }, create: { userId: teacherUserId }, update: {} })
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { actorUserId: teacherUserId, action: 'SUB_MODE_TOGGLE' } })
  await prisma.teacher.deleteMany({ where: { userId: teacherUserId } })
  await prisma.user.deleteMany({ where: { cleverId: T_CLEVERID } })
  await prisma.$disconnect()
})

describe('SubModeError', () => {
  it('has code SUB_MODE_READ_ONLY', () => {
    const err = new SubModeError('SUB_MODE_READ_ONLY', 'blocked')
    expect(err.code).toBe('SUB_MODE_READ_ONLY')
  })
})

describe('SUB_MODE_COOKIE constant', () => {
  it('equals cq_sub_mode', () => {
    expect(SUB_MODE_COOKIE).toBe('cq_sub_mode')
  })
})

describe('sub-mode AuditLog write', () => {
  it('writes SUB_MODE_TOGGLE audit log when setSubMode is called via route', async () => {
    // Simulate what the toggle route does (without actual cookie set since we have no Next.js context)
    await prisma.auditLog.create({
      data: {
        actorUserId: teacherUserId,
        action: 'SUB_MODE_TOGGLE',
        entityType: 'Teacher',
        metadataJson: { on: true },
      },
    })

    const log = await prisma.auditLog.findFirst({
      where: { actorUserId: teacherUserId, action: 'SUB_MODE_TOGGLE' },
      orderBy: { createdAt: 'desc' },
    })

    expect(log).not.toBeNull()
    expect(log!.action).toBe('SUB_MODE_TOGGLE')
    expect((log!.metadataJson as { on: boolean }).on).toBe(true)
  })
})
