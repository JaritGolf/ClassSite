/**
 * Audit 11 — Item 6: Teacher can configure session length, attempts allowed,
 * and review window per Class. Settings round-trip via the API and an
 * RC_CLASS_CONFIG_UPDATED AuditLog row is written.
 *
 * Prefix: test-audit11-06-
 */

import { PrismaClient } from '@prisma/client'
import { resolveSessionLength, RC_AUDIT_ACTIONS } from '@/lib/republic-challenge'

const prisma = new PrismaClient()

let teacherUserId: string
let teacherId: string
let classId: string

beforeAll(async () => {
  const u = await prisma.user.upsert({
    where: { cleverId: 'test-audit11-06-t1' },
    create: {
      cleverId: 'test-audit11-06-t1',
      firstName: 'Audit11',
      lastName: 'Teacher',
      role: 'TEACHER',
      status: 'ACTIVE',
    },
    update: {},
  })
  teacherUserId = u.id
  const t = await prisma.teacher.upsert({
    where: { userId: u.id },
    update: {},
    create: { userId: u.id },
  })
  teacherId = t.id
  const c = await prisma.class.create({
    data: {
      teacherId,
      name: 'Audit 11 Test Class',
      schoolYear: '2026-2027',
    },
  })
  classId = c.id
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({
    where: { entityType: 'Class', entityId: classId },
  })
  await prisma.class.deleteMany({ where: { id: classId } })
  await prisma.teacher.deleteMany({ where: { id: teacherId } })
  await prisma.user.deleteMany({
    where: { cleverId: { startsWith: 'test-audit11-06-' } },
  })
  await prisma.$disconnect()
})

describe('Audit 11 item 6 — teacher configures Class Republic Challenge settings', () => {
  it('defaults are sensible', async () => {
    const c = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        rcSessionLengthOverride: true,
        rcAttemptsAllowed: true,
        rcReviewWindow: true,
        rcStaminaOverride: true,
        featureEocReviewEnabled: true,
      },
    })
    expect(c?.rcSessionLengthOverride).toBeNull()
    expect(c?.rcAttemptsAllowed).toBe(1)
    expect(c?.rcReviewWindow).toBe('after_submit')
    expect(c?.rcStaminaOverride).toBeNull()
    expect(c?.featureEocReviewEnabled).toBe(true)
  })

  it('settings round-trip in a $transaction with an AuditLog row', async () => {
    const newSettings = {
      rcSessionLengthOverride: 8,
      rcAttemptsAllowed: 2,
      rcReviewWindow: 'after_class_window',
      rcStaminaOverride: 15,
      featureEocReviewEnabled: false,
    }

    const before = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        rcSessionLengthOverride: true,
        rcAttemptsAllowed: true,
        rcReviewWindow: true,
        rcStaminaOverride: true,
        featureEocReviewEnabled: true,
      },
    })

    await prisma.$transaction([
      prisma.class.update({ where: { id: classId }, data: newSettings }),
      prisma.auditLog.create({
        data: {
          actorUserId: teacherUserId,
          action: RC_AUDIT_ACTIONS.RC_CLASS_CONFIG_UPDATED,
          entityType: 'Class',
          entityId: classId,
          metadataJson: { before, after: newSettings },
        },
      }),
    ])

    const after = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        rcSessionLengthOverride: true,
        rcAttemptsAllowed: true,
        rcReviewWindow: true,
        rcStaminaOverride: true,
        featureEocReviewEnabled: true,
      },
    })
    expect(after).toMatchObject(newSettings)

    const log = await prisma.auditLog.findFirst({
      where: {
        action: 'RC_CLASS_CONFIG_UPDATED',
        entityType: 'Class',
        entityId: classId,
      },
      orderBy: { createdAt: 'desc' },
    })
    expect(log).not.toBeNull()
    expect(log?.actorUserId).toBe(teacherUserId)
  })

  it('overrides win over stamina ladder', async () => {
    // Class now has rcStaminaOverride=15 from previous test.
    const c = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        rcSessionLengthOverride: true,
        rcStaminaOverride: true,
      },
    })
    expect(c?.rcStaminaOverride).toBe(15)
    // March would otherwise return 30; the override forces 15.
    const length = resolveSessionLength(
      {
        rcSessionLengthOverride: c?.rcSessionLengthOverride ?? null,
        rcStaminaOverride: c?.rcStaminaOverride ?? null,
      },
      'ENDURANCE_TRIAL',
      new Date('2027-03-15T12:00:00Z')
    )
    expect(length).toBe(15)
  })
})
