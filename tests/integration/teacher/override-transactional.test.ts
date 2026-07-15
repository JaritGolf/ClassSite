/**
 * Integration Tests — Override Transactional
 *
 * Confirms that applyTeacherOverride now writes TeacherOverride + AuditLog
 * in a single atomic $transaction.
 *
 * Prefix: test-phase9c-override-tx-
 */

import { PrismaClient } from '@prisma/client'
import { applyTeacherOverride } from '@/lib/mastery/override'
import { enrollStudentWithTeacher, cleanupTestRoster } from '../../helpers/roster'

const prisma = new PrismaClient()

const T_CLEVERID = 'test-phase9c-override-tx-teacher'
const S_CLEVERID = 'test-phase9c-override-tx-student'
let teacherUserId: string
let studentId: string
let benchmarkId: string

beforeAll(async () => {
  const teacherUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: { cleverId: T_CLEVERID, email: `${T_CLEVERID}@test.invalid`, firstName: 'OvTxT', lastName: 'Test', role: 'TEACHER' },
    update: {},
    select: { id: true },
  })
  teacherUserId = teacherUser.id
  await prisma.teacher.upsert({ where: { userId: teacherUserId }, create: { userId: teacherUserId }, update: {} })

  const studentUser = await prisma.user.upsert({
    where: { cleverId: S_CLEVERID },
    create: { cleverId: S_CLEVERID, email: `${S_CLEVERID}@test.invalid`, firstName: 'OvTxS', lastName: 'Test', role: 'STUDENT' },
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

  // Roster scope: applyTeacherOverride now requires the student to be in the
  // teacher's class.
  await enrollStudentWithTeacher(prisma, teacherUserId, studentId)

  const bm = await prisma.benchmark.findFirst({ select: { id: true } })
  if (!bm) throw new Error('No benchmark in DB')
  benchmarkId = bm.id

  // Upsert progress so UNLOCK action works
  await prisma.studentProgress.upsert({
    where: { studentId_benchmarkId: { studentId, benchmarkId } },
    create: { studentId, benchmarkId, status: 'IN_PROGRESS' },
    update: {},
  })
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { actorUserId: teacherUserId } })
  await prisma.teacherOverride.deleteMany({ where: { teacher: { userId: teacherUserId } } })
  await prisma.studentProgress.deleteMany({ where: { studentId } })
  await cleanupTestRoster(prisma, teacherUserId)
  await prisma.student.deleteMany({ where: { id: studentId } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [T_CLEVERID, S_CLEVERID] } } })
  await prisma.$disconnect()
})

describe('applyTeacherOverride — transactional', () => {
  it('creates a TeacherOverride row', async () => {
    const result = await applyTeacherOverride(
      teacherUserId, studentId, benchmarkId, 'UNLOCK_BENCHMARK', 'Testing transactional override'
    )

    const override = await prisma.teacherOverride.findUnique({ where: { id: result.overrideId } })
    expect(override).not.toBeNull()
    expect(override!.action).toBe('UNLOCK_BENCHMARK')
  })

  it('creates an AuditLog row in the same call', async () => {
    const result = await applyTeacherOverride(
      teacherUserId, studentId, benchmarkId, 'EXTEND_DEADLINE', 'Testing AuditLog atomicity'
    )

    const log = await prisma.auditLog.findUnique({ where: { id: result.auditLogId } })
    expect(log).not.toBeNull()
    expect(log!.action).toBe('TEACHER_OVERRIDE_EXTEND_DEADLINE')
  })

  it('TeacherOverride.id matches AuditLog.entityId', async () => {
    const result = await applyTeacherOverride(
      teacherUserId, studentId, benchmarkId, 'CUSTOM', 'Verifying entityId link'
    )

    const log = await prisma.auditLog.findUnique({ where: { id: result.auditLogId } })
    expect(log!.entityId).toBe(result.overrideId)
  })
})
