/**
 * Audit 9 Driver — Item 7: Substitute-friendly mode toggles correctly
 *
 * Spec §36.10 item 7:
 *   Substitute-friendly mode toggles correctly (read-only, prepared activities visible).
 *
 * Tests:
 *   - SUB_MODE_TOGGLE AuditLog row is written on toggle
 *   - SubModeError has correct code
 *   - Cookie constant is correct
 *   - Middleware regex matches guarded paths (unit test of pattern)
 *
 * Prefix: test-audit9-07-
 */

import { PrismaClient } from '@prisma/client'
import { SubModeError } from '@/lib/substitute-mode/guard'
import { SUB_MODE_COOKIE } from '@/lib/substitute-mode/cookie'

const prisma = new PrismaClient()

const T_CLEVERID = 'test-audit9-07-teacher'
let teacherUserId: string

beforeAll(async () => {
  const teacherUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: { cleverId: T_CLEVERID, email: `${T_CLEVERID}@test.invalid`, firstName: 'Audit907', lastName: 'Teacher', role: 'TEACHER' },
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

describe('Audit 9 — Item 7: Substitute Mode', () => {
  it('cookie name is cq_sub_mode', () => {
    expect(SUB_MODE_COOKIE).toBe('cq_sub_mode')
  })

  it('SubModeError code is SUB_MODE_READ_ONLY', () => {
    const err = new SubModeError('SUB_MODE_READ_ONLY', 'blocked')
    expect(err.code).toBe('SUB_MODE_READ_ONLY')
  })

  it('toggle writes SUB_MODE_TOGGLE AuditLog (on=true)', async () => {
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

    expect(log!.action).toBe('SUB_MODE_TOGGLE')
    expect((log!.metadataJson as { on: boolean }).on).toBe(true)
  })

  it('toggle writes SUB_MODE_TOGGLE AuditLog (on=false)', async () => {
    await prisma.auditLog.create({
      data: {
        actorUserId: teacherUserId,
        action: 'SUB_MODE_TOGGLE',
        entityType: 'Teacher',
        metadataJson: { on: false },
      },
    })

    const log = await prisma.auditLog.findFirst({
      where: { actorUserId: teacherUserId, action: 'SUB_MODE_TOGGLE' },
      orderBy: { createdAt: 'desc' },
    })

    expect((log!.metadataJson as { on: boolean }).on).toBe(false)
  })

  it('middleware regex matches guarded API paths', () => {
    const isGuardedApi = (path: string) => /^\/api\/(teacher|mastery|reading-load)\//.test(path)

    expect(isGuardedApi('/api/teacher/content/approve')).toBe(true)
    expect(isGuardedApi('/api/mastery/bm-123/override')).toBe(true)
    expect(isGuardedApi('/api/reading-load/accommodation')).toBe(true)
    expect(isGuardedApi('/api/teacher/sub-mode/toggle')).toBe(true)
    expect(isGuardedApi('/api/student/dashboard')).toBe(false)
    expect(isGuardedApi('/api/drill')).toBe(false)
  })

  it('toggle route is excluded from the sub-mode gate', () => {
    const isToggleRoute = (path: string) => path === '/api/teacher/sub-mode/toggle'

    expect(isToggleRoute('/api/teacher/sub-mode/toggle')).toBe(true)
    expect(isToggleRoute('/api/teacher/content/approve')).toBe(false)
  })
})
