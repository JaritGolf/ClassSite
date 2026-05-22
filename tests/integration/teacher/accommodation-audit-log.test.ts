/**
 * Integration Tests — Accommodation Audit Log Gap Fix
 *
 * Tests that POST /api/reading-load/accommodation (via setAccommodation)
 * writes an AuditLog row with action='ACCOMMODATION_SET'.
 *
 * Audit 9, item 8.
 *
 * Prefix: test-phase9c-
 */

import { PrismaClient } from '@prisma/client'
import { setAccommodation } from '@/lib/reading-load'

const prisma = new PrismaClient()

let teacherUserId: string
let studentId: string
let accommodationCode: string

const T_CLEVERID = 'test-phase9c-teacher-001'
const S_CLEVERID = 'test-phase9c-student-001'
const ACC_CODE = 'TEST-ACC-PHASE9C'

beforeAll(async () => {
  // Teacher
  const teacherUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: {
      cleverId: T_CLEVERID,
      email: `${T_CLEVERID}@test.invalid`,
      firstName: 'Phase9C', lastName: 'Teacher',
      role: 'TEACHER',
    },
    update: {},
    select: { id: true },
  })
  teacherUserId = teacherUser.id

  await prisma.teacher.upsert({
    where: { userId: teacherUserId },
    create: { userId: teacherUserId },
    update: {},
  })

  // Student
  const studentUser = await prisma.user.upsert({
    where: { cleverId: S_CLEVERID },
    create: {
      cleverId: S_CLEVERID,
      email: `${S_CLEVERID}@test.invalid`,
      firstName: 'Phase9C', lastName: 'Student',
      role: 'STUDENT',
    },
    update: {},
    select: { id: true },
  })
  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    create: { userId: studentUser.id },
    update: {},
    select: { id: true },
  })
  studentId = student.id

  // Accommodation
  await prisma.accommodation.upsert({
    where: { code: ACC_CODE },
    create: {
      code: ACC_CODE,
      name: 'Phase 9C Test Accommodation',
      description: 'Test accommodation for phase 9 audit-log test',
    },
    update: {},
  })
  accommodationCode = ACC_CODE
})

afterAll(async () => {
  await prisma.studentAccommodation.deleteMany({
    where: { student: { userId: (await prisma.user.findUnique({ where: { cleverId: S_CLEVERID }, select: { id: true } }))?.id } },
  })
  await prisma.auditLog.deleteMany({ where: { actorUserId: teacherUserId, action: 'ACCOMMODATION_SET' } })
  await prisma.accommodation.deleteMany({ where: { code: ACC_CODE } })
  await prisma.student.deleteMany({ where: { id: studentId } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [T_CLEVERID, S_CLEVERID] } } })
  await prisma.$disconnect()
})

describe('setAccommodation — AuditLog', () => {
  it('writes an AuditLog row with action=ACCOMMODATION_SET', async () => {
    await setAccommodation(teacherUserId, studentId, accommodationCode, true)

    const log = await prisma.auditLog.findFirst({
      where: {
        actorUserId: teacherUserId,
        action: 'ACCOMMODATION_SET',
      },
      orderBy: { createdAt: 'desc' },
    })

    expect(log).not.toBeNull()
    expect(log!.action).toBe('ACCOMMODATION_SET')
    expect(log!.entityType).toBe('StudentAccommodation')
    expect(log!.actorUserId).toBe(teacherUserId)
  })

  it('metadataJson contains studentId, accommodationCode, and active', async () => {
    await setAccommodation(teacherUserId, studentId, accommodationCode, false)

    const log = await prisma.auditLog.findFirst({
      where: {
        actorUserId: teacherUserId,
        action: 'ACCOMMODATION_SET',
      },
      orderBy: { createdAt: 'desc' },
    })

    expect(log!.metadataJson).toMatchObject({
      studentId,
      accommodationCode,
      active: false,
    })
  })

  it('metadataJson includes reason when provided', async () => {
    await setAccommodation(
      teacherUserId,
      studentId,
      accommodationCode,
      true,
      'IEP accommodation'
    )

    const log = await prisma.auditLog.findFirst({
      where: {
        actorUserId: teacherUserId,
        action: 'ACCOMMODATION_SET',
      },
      orderBy: { createdAt: 'desc' },
    })

    expect(log!.metadataJson).toMatchObject({
      reason: 'IEP accommodation',
    })
  })

  it('reason is null in metadataJson when not provided', async () => {
    await setAccommodation(teacherUserId, studentId, accommodationCode, true)

    const log = await prisma.auditLog.findFirst({
      where: {
        actorUserId: teacherUserId,
        action: 'ACCOMMODATION_SET',
      },
      orderBy: { createdAt: 'desc' },
    })

    expect((log!.metadataJson as Record<string, unknown>).reason).toBeNull()
  })
})
