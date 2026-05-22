/**
 * Integration Tests — Class Decay
 *
 * Tests that getClassDecayRates (from spaced-retrieval/decay) fires spikeAlert
 * when decay rate >= 50% of the class on a benchmark.
 *
 * Prefix: test-9b-decay- to avoid collision.
 */

import { PrismaClient } from '@prisma/client'
import { getClassDecayRates } from '@/lib/spaced-retrieval/decay'
import { resolveTeacherId } from '@/lib/teacher-roster'

const prisma = new PrismaClient()

let teacherUserId: string
let teacherId: string
let classId: string
let student1Id: string
let student2Id: string
let benchmarkId: string

const T_CLEVERID = 'test-9b-decay-teacher-001'
const S1_CLEVERID = 'test-9b-decay-student-001'
const S2_CLEVERID = 'test-9b-decay-student-002'

beforeAll(async () => {
  // Get a benchmark
  const benchmark = await prisma.benchmark.findFirst({ select: { id: true } })
  if (!benchmark) throw new Error('No benchmarks in DB')
  benchmarkId = benchmark.id

  // Teacher
  const teacherUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: {
      cleverId: T_CLEVERID,
      email: `${T_CLEVERID}@test.invalid`,
      firstName: '9bDecay', lastName: 'Teacher',
      role: 'TEACHER',
    },
    update: {},
    select: { id: true },
  })
  teacherUserId = teacherUser.id

  const teacher = await prisma.teacher.upsert({
    where: { userId: teacherUserId },
    create: { userId: teacherUserId },
    update: {},
    select: { id: true },
  })
  teacherId = teacher.id

  // Students
  const makeStudent = async (cleverId: string, firstName: string) => {
    const u = await prisma.user.upsert({
      where: { cleverId },
      create: {
        cleverId,
        email: `${cleverId}@test.invalid`,
        firstName, lastName: 'Student',
        role: 'STUDENT',
      },
      update: {},
      select: { id: true },
    })
    const s = await prisma.student.upsert({
      where: { userId: u.id },
      create: { userId: u.id },
      update: {},
      select: { id: true },
    })
    return s.id
  }

  student1Id = await makeStudent(S1_CLEVERID, '9bDecay1')
  student2Id = await makeStudent(S2_CLEVERID, '9bDecay2')

  // Class
  const cls = await prisma.class.create({
    data: { teacherId, name: '9bDecay Test Class', schoolYear: '2025-2026' },
    select: { id: true },
  })
  classId = cls.id

  // Enroll both
  for (const sid of [student1Id, student2Id]) {
    await prisma.classEnrollment.upsert({
      where: { classId_studentId: { classId, studentId: sid } },
      create: { classId, studentId: sid, status: 'ACTIVE' },
      update: {},
    })
  }

  // Create SpacedReviewState for both students — both decaying (quality=2 < 3)
  const dueAt = new Date(Date.now() + 7 * 86400000)
  for (const sid of [student1Id, student2Id]) {
    await prisma.spacedReviewState.upsert({
      where: { studentId_benchmarkId: { studentId: sid, benchmarkId } },
      create: {
        studentId: sid,
        benchmarkId,
        repetitionCount: 3,
        easinessFactor: 2.5,
        intervalDays: 7,
        dueAt,
        lastReviewedAt: new Date(),
        lastQuality: 2, // < 3 = decaying
      },
      update: { lastQuality: 2 },
    })
  }
})

afterAll(async () => {
  await prisma.spacedReviewState.deleteMany({
    where: { studentId: { in: [student1Id, student2Id] }, benchmarkId },
  })
  await prisma.classEnrollment.deleteMany({ where: { classId } })
  await prisma.class.deleteMany({ where: { id: classId } })
  await prisma.student.deleteMany({ where: { id: { in: [student1Id, student2Id] } } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [T_CLEVERID, S1_CLEVERID, S2_CLEVERID] } } })
  await prisma.$disconnect()
})

describe('getClassDecayRates — spike flag fires at 50%', () => {
  it('resolves teacher and gets decay rates', async () => {
    const tid = await resolveTeacherId(teacherUserId)
    expect(tid).toBe(teacherId)
    const rates = await getClassDecayRates(tid)
    expect(Array.isArray(rates)).toBe(true)
  })

  it('flags spikeAlert=true when 100% of class is decaying on a benchmark', async () => {
    const tid = await resolveTeacherId(teacherUserId)
    const rates = await getClassDecayRates(tid)
    const ourBenchmark = rates.find((r) => r.benchmarkId === benchmarkId)
    expect(ourBenchmark).toBeDefined()
    // 2 out of 2 students decaying = 100% >= 50% spike threshold
    expect(ourBenchmark!.spikeAlert).toBe(true)
    expect(ourBenchmark!.decayRatePercent).toBe(100)
    expect(ourBenchmark!.decayingStudents).toBe(2)
  })

  it('decay rate is correct fraction', async () => {
    const tid = await resolveTeacherId(teacherUserId)
    const rates = await getClassDecayRates(tid)
    const ourBenchmark = rates.find((r) => r.benchmarkId === benchmarkId)
    expect(ourBenchmark!.decayingStudents).toBeLessThanOrEqual(ourBenchmark!.totalStudents)
    expect(ourBenchmark!.decayRatePercent).toBeGreaterThanOrEqual(50)
  })
})
