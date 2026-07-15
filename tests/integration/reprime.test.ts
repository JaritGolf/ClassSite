/**
 * Integration — class re-priming halves SM-2 intervals and pulls dueAt forward.
 *
 * Replaces the old Phase-9 stub behaviour (audit-log only). Verifies the
 * intervention actually resurfaces decaying material sooner.
 *
 * Prefix: test-reprime- (isolated).
 */

import { PrismaClient } from '@prisma/client'
import { reprimeClass, ReprimeError } from '@/lib/spaced-retrieval'

const prisma = new PrismaClient()

let teacherUserId: string
let otherTeacherUserId: string
let classId: string
let studentId: string
let benchmarkId: string

const PREFIX = 'test-reprime-'

beforeAll(async () => {
  const benchmark = await prisma.benchmark.findFirstOrThrow({
    where: { code: 'SS.7.CG.1.1' },
    select: { id: true },
  })
  benchmarkId = benchmark.id

  const mkTeacher = async (suffix: string) => {
    const u = await prisma.user.upsert({
      where: { cleverId: `${PREFIX}${suffix}` },
      update: {},
      create: { cleverId: `${PREFIX}${suffix}`, firstName: 'R', lastName: suffix, role: 'TEACHER', status: 'ACTIVE' },
    })
    const t = await prisma.teacher.upsert({
      where: { userId: u.id },
      update: {},
      create: { userId: u.id },
      select: { id: true },
    })
    return { userId: u.id, teacherId: t.id }
  }
  const teacher = await mkTeacher('teacher')
  const other = await mkTeacher('other')
  teacherUserId = teacher.userId
  otherTeacherUserId = other.userId

  const studentUser = await prisma.user.upsert({
    where: { cleverId: `${PREFIX}student` },
    update: {},
    create: { cleverId: `${PREFIX}student`, firstName: 'R', lastName: 'S', role: 'STUDENT', status: 'ACTIVE' },
  })
  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: { userId: studentUser.id, gradeLevel: 7 },
    select: { id: true },
  })
  studentId = student.id

  const cls = await prisma.class.create({
    data: { teacherId: teacher.teacherId, name: `${PREFIX}class`, schoolYear: '2025-2026' },
    select: { id: true },
  })
  classId = cls.id
  await prisma.classEnrollment.create({ data: { classId, studentId, status: 'ACTIVE' } })

  // A review state due 20 days out with a 20-day interval.
  await prisma.spacedReviewState.upsert({
    where: { studentId_benchmarkId: { studentId, benchmarkId } },
    update: { intervalDays: 20, dueAt: new Date(Date.now() + 20 * 86400000) },
    create: {
      studentId,
      benchmarkId,
      intervalDays: 20,
      dueAt: new Date(Date.now() + 20 * 86400000),
      repetitionCount: 3,
    },
  })
})

afterAll(async () => {
  await prisma.spacedReviewState.deleteMany({ where: { studentId } })
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: [teacherUserId, otherTeacherUserId] } } })
  await prisma.classEnrollment.deleteMany({ where: { classId } })
  await prisma.class.deleteMany({ where: { id: classId } })
  await prisma.student.deleteMany({ where: { user: { cleverId: { startsWith: PREFIX } } } })
  await prisma.teacher.deleteMany({ where: { user: { cleverId: { startsWith: PREFIX } } } })
  await prisma.user.deleteMany({ where: { cleverId: { startsWith: PREFIX } } })
  await prisma.$disconnect()
})

describe('reprimeClass', () => {
  it('halves the interval and pulls dueAt forward', async () => {
    const before = await prisma.spacedReviewState.findUniqueOrThrow({
      where: { studentId_benchmarkId: { studentId, benchmarkId } },
      select: { intervalDays: true, dueAt: true },
    })

    const result = await reprimeClass(teacherUserId, classId, benchmarkId)
    expect(result.affectedStates).toBe(1)
    expect(result.studentsAffected).toBe(1)

    const after = await prisma.spacedReviewState.findUniqueOrThrow({
      where: { studentId_benchmarkId: { studentId, benchmarkId } },
      select: { intervalDays: true, dueAt: true },
    })
    expect(after.intervalDays).toBe(10) // 20 → 10
    expect(after.dueAt.getTime()).toBeLessThan(before.dueAt.getTime())
  })

  it('throws FORBIDDEN for a class the teacher does not own', async () => {
    await expect(
      reprimeClass(otherTeacherUserId, classId, benchmarkId)
    ).rejects.toBeInstanceOf(ReprimeError)
    await expect(
      reprimeClass(otherTeacherUserId, classId, benchmarkId)
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})
