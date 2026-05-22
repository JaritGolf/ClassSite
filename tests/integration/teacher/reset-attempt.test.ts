/**
 * Integration Tests — Reset Attempt
 *
 * Tests that resetAttempt sets voided=true, clears score/passed,
 * and writes an AuditLog row.
 *
 * Prefix: test-phase9c-reset-
 */

import { PrismaClient } from '@prisma/client'
import { resetAttempt, ResetError } from '@/lib/assessment-reset'

const prisma = new PrismaClient()

const T_CLEVERID = 'test-phase9c-reset-teacher'
const S_CLEVERID = 'test-phase9c-reset-student'
let teacherUserId: string
let studentId: string
let attemptId: string
let assessmentId: string

beforeAll(async () => {
  // Teacher
  const teacherUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: { cleverId: T_CLEVERID, email: `${T_CLEVERID}@test.invalid`, firstName: 'ResetT', lastName: 'Test', role: 'TEACHER' },
    update: {},
    select: { id: true },
  })
  teacherUserId = teacherUser.id
  await prisma.teacher.upsert({ where: { userId: teacherUserId }, create: { userId: teacherUserId }, update: {} })

  // Student
  const studentUser = await prisma.user.upsert({
    where: { cleverId: S_CLEVERID },
    create: { cleverId: S_CLEVERID, email: `${S_CLEVERID}@test.invalid`, firstName: 'ResetS', lastName: 'Test', role: 'STUDENT' },
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

  // Class + enrollment
  const teacher = await prisma.teacher.findUnique({ where: { userId: teacherUserId }, select: { id: true } })
  const cls = await prisma.class.create({
    data: { teacherId: teacher!.id, name: 'Reset Test Class', schoolYear: '2025-26' },
    select: { id: true },
  })
  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId: cls.id, studentId } },
    create: { classId: cls.id, studentId },
    update: {},
  })

  // Assessment + attempt
  const bm = await prisma.benchmark.findFirst({ select: { id: true } })
  if (!bm) throw new Error('No benchmark in DB')

  const assessment = await prisma.assessment.create({
    data: { benchmarkId: bm.id, title: 'Reset Test Assessment', assessmentType: 'MASTERY_CHALLENGE' },
    select: { id: true },
  })
  assessmentId = assessment.id

  const attempt = await prisma.assessmentAttempt.create({
    data: { assessmentId, studentId, attemptNumber: 1, score: 0.6, passed: false, submittedAt: new Date() },
    select: { id: true },
  })
  attemptId = attempt.id
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { actorUserId: teacherUserId, action: 'RESET_ATTEMPT' } })
  await prisma.assessmentAttempt.deleteMany({ where: { assessmentId } })
  await prisma.assessment.deleteMany({ where: { id: assessmentId } })
  await prisma.classEnrollment.deleteMany({ where: { studentId } })
  await prisma.class.deleteMany({ where: { teacher: { userId: teacherUserId } } })
  await prisma.student.deleteMany({ where: { id: studentId } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [T_CLEVERID, S_CLEVERID] } } })
  await prisma.$disconnect()
})

describe('resetAttempt', () => {
  it('sets voided=true on the attempt', async () => {
    await resetAttempt(teacherUserId, attemptId, 'Student experienced technical issues')

    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      select: { voided: true, score: true, passed: true },
    })

    expect(attempt!.voided).toBe(true)
    expect(attempt!.score).toBeNull()
    expect(attempt!.passed).toBeNull()
  })

  it('writes an AuditLog row with action=RESET_ATTEMPT', async () => {
    const log = await prisma.auditLog.findFirst({
      where: { actorUserId: teacherUserId, action: 'RESET_ATTEMPT' },
      orderBy: { createdAt: 'desc' },
    })

    expect(log).not.toBeNull()
    expect(log!.entityType).toBe('AssessmentAttempt')
    expect(log!.entityId).toBe(attemptId)
  })

  it('metadataJson includes original score and reason', async () => {
    const log = await prisma.auditLog.findFirst({
      where: { actorUserId: teacherUserId, action: 'RESET_ATTEMPT' },
      orderBy: { createdAt: 'desc' },
    })

    const meta = log!.metadataJson as { snapshot: { originalScore: number | null }; reason: string }
    expect(meta.snapshot.originalScore).toBe(0.6)
    expect(meta.reason).toBe('Student experienced technical issues')
  })

  it('throws INVALID_STATE when attempt is already voided', async () => {
    await expect(
      resetAttempt(teacherUserId, attemptId, 'double void')
    ).rejects.toThrow(ResetError)

    try {
      await resetAttempt(teacherUserId, attemptId, 'double void')
    } catch (e) {
      expect((e as ResetError).code).toBe('INVALID_STATE')
    }
  })
})
