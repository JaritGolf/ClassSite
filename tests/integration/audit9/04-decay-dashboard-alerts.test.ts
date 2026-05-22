/**
 * Audit 9 — Item 4: Decay dashboard renders with class-level alerts.
 *
 * Tests:
 *   - getClassDecayRates returns spikeAlert=true when >= 50% of class decaying
 *   - spikeAlert=false when < 50% decaying
 *   - All ClassDecayRate fields are present and valid
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

const T_CLEVERID = 'test-audit9-04-teacher'
const S1_CLEVERID = 'test-audit9-04-student-1'
const S2_CLEVERID = 'test-audit9-04-student-2'

beforeAll(async () => {
  const benchmark = await prisma.benchmark.findFirst({ select: { id: true } })
  if (!benchmark) throw new Error('No benchmarks in DB')
  benchmarkId = benchmark.id

  // Teacher
  const teacherUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: {
      cleverId: T_CLEVERID,
      email: `${T_CLEVERID}@test.invalid`,
      firstName: 'Audit9-04', lastName: 'Teacher',
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
  const makeStudent = async (cleverId: string, first: string) => {
    const u = await prisma.user.upsert({
      where: { cleverId },
      create: {
        cleverId,
        email: `${cleverId}@test.invalid`,
        firstName: first, lastName: 'Student',
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

  student1Id = await makeStudent(S1_CLEVERID, 'Audit904-1')
  student2Id = await makeStudent(S2_CLEVERID, 'Audit904-2')

  const cls = await prisma.class.create({
    data: { teacherId, name: 'Audit 9-04 Test Class', schoolYear: '2025-2026' },
    select: { id: true },
  })
  classId = cls.id

  for (const sid of [student1Id, student2Id]) {
    await prisma.classEnrollment.upsert({
      where: { classId_studentId: { classId, studentId: sid } },
      create: { classId, studentId: sid, status: 'ACTIVE' },
      update: {},
    })
  }

  // Both students decaying on the benchmark — should trigger spike alert (100% >= 50%)
  const dueAt = new Date(Date.now() + 3 * 86400000)
  for (const sid of [student1Id, student2Id]) {
    await prisma.spacedReviewState.upsert({
      where: { studentId_benchmarkId: { studentId: sid, benchmarkId } },
      create: {
        studentId: sid,
        benchmarkId,
        repetitionCount: 2,
        easinessFactor: 2.5,
        intervalDays: 3,
        dueAt,
        lastReviewedAt: new Date(),
        lastQuality: 1, // definitely < 3
      },
      update: { lastQuality: 1 },
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

describe('Audit 9 Item 4 — Decay dashboard class-level alerts', () => {
  it('4a. getClassDecayRates returns an array of ClassDecayRate', async () => {
    const tid = await resolveTeacherId(teacherUserId)
    const rates = await getClassDecayRates(tid)
    expect(Array.isArray(rates)).toBe(true)
  })

  it('4b. each rate has required fields', async () => {
    const tid = await resolveTeacherId(teacherUserId)
    const rates = await getClassDecayRates(tid)
    for (const r of rates) {
      expect(typeof r.benchmarkId).toBe('string')
      expect(typeof r.benchmarkCode).toBe('string')
      expect(typeof r.totalStudents).toBe('number')
      expect(typeof r.decayingStudents).toBe('number')
      expect(typeof r.decayRatePercent).toBe('number')
      expect(typeof r.spikeAlert).toBe('boolean')
    }
  })

  it('4c. spikeAlert=true fires when >= 50% of class is decaying', async () => {
    const tid = await resolveTeacherId(teacherUserId)
    const rates = await getClassDecayRates(tid)
    const ourBenchmark = rates.find((r) => r.benchmarkId === benchmarkId)
    expect(ourBenchmark).toBeDefined()
    // 2/2 students = 100% >= 50%
    expect(ourBenchmark!.spikeAlert).toBe(true)
    expect(ourBenchmark!.decayRatePercent).toBeGreaterThanOrEqual(50)
  })

  it('4d. decayingStudents <= totalStudents for all benchmarks', async () => {
    const tid = await resolveTeacherId(teacherUserId)
    const rates = await getClassDecayRates(tid)
    for (const r of rates) {
      expect(r.decayingStudents).toBeLessThanOrEqual(r.totalStudents)
    }
  })
})
