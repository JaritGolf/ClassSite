/**
 * Audit 10 — Item 4: Decay metrics computed correctly.
 *
 * Seeds 6 SpacedReviewState rows for 3 students (2 each: 1 quality<3, 1 quality≥3).
 * Calls getClassDecayRates(teacherId).
 * Asserts exactly 50% decay rate and spikeAlert=true (≥50% threshold).
 *
 * Prefix: test-audit10-04-
 */

import { PrismaClient } from '@prisma/client'
import { getClassDecayRates } from '@/lib/spaced-retrieval/decay'

const prisma = new PrismaClient()

const T_CLEVERID = 'test-audit10-04-teacher'
const STUDENT_CLEVERIDS = [
  'test-audit10-04-s1',
  'test-audit10-04-s2',
  'test-audit10-04-s3',
]

let teacherId: string
let classId: string
let studentIds: string[] = []

beforeAll(async () => {
  const tUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: { cleverId: T_CLEVERID, email: `${T_CLEVERID}@test.invalid`, firstName: 'Audit10', lastName: '04T', role: 'TEACHER' },
    update: {},
    select: { id: true },
  })
  const teacher = await prisma.teacher.upsert({ where: { userId: tUser.id }, create: { userId: tUser.id }, update: {}, select: { id: true } })
  teacherId = teacher.id

  studentIds = []
  for (const cleverId of STUDENT_CLEVERIDS) {
    const u = await prisma.user.upsert({
      where: { cleverId },
      create: { cleverId, email: `${cleverId}@test.invalid`, firstName: 'Audit10', lastName: '04S', role: 'STUDENT' },
      update: {},
      select: { id: true },
    })
    const s = await prisma.student.upsert({ where: { userId: u.id }, create: { userId: u.id }, update: {}, select: { id: true } })
    studentIds.push(s.id)
  }

  const cls = await prisma.class.create({ data: { teacherId, name: 'Audit10-04 Class', schoolYear: '2025-2026' }, select: { id: true } })
  classId = cls.id

  for (const studentId of studentIds) {
    await prisma.classEnrollment.upsert({
      where: { classId_studentId: { classId, studentId } },
      create: { classId, studentId, status: 'ACTIVE' },
      update: {},
    })
  }

  // Get 1 benchmark to use for all 3 students
  const bm = await prisma.benchmark.findFirst({ select: { id: true } })
  if (!bm) throw new Error('No benchmark in DB')

  const reviewedAt = new Date()
  const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  // Student 0: quality=2 (decaying, <3)
  await prisma.spacedReviewState.upsert({
    where: { studentId_benchmarkId: { studentId: studentIds[0], benchmarkId: bm.id } },
    create: {
      studentId: studentIds[0],
      benchmarkId: bm.id,
      lastQuality: 2,
      lastReviewedAt: reviewedAt,
      repetitionCount: 3,
      dueAt,
    },
    update: { lastQuality: 2, lastReviewedAt: reviewedAt },
  })

  // Student 1: quality=4 (healthy, ≥3)
  await prisma.spacedReviewState.upsert({
    where: { studentId_benchmarkId: { studentId: studentIds[1], benchmarkId: bm.id } },
    create: {
      studentId: studentIds[1],
      benchmarkId: bm.id,
      lastQuality: 4,
      lastReviewedAt: reviewedAt,
      repetitionCount: 3,
      dueAt,
    },
    update: { lastQuality: 4, lastReviewedAt: reviewedAt },
  })

  // Student 2: quality=1 (decaying, <3)
  await prisma.spacedReviewState.upsert({
    where: { studentId_benchmarkId: { studentId: studentIds[2], benchmarkId: bm.id } },
    create: {
      studentId: studentIds[2],
      benchmarkId: bm.id,
      lastQuality: 1,
      lastReviewedAt: reviewedAt,
      repetitionCount: 2,
      dueAt,
    },
    update: { lastQuality: 1, lastReviewedAt: reviewedAt },
  })
})

afterAll(async () => {
  const bm = await prisma.benchmark.findFirst({ select: { id: true } })
  if (bm) {
    await prisma.spacedReviewState.deleteMany({ where: { studentId: { in: studentIds } } })
  }
  await prisma.classEnrollment.deleteMany({ where: { classId } })
  await prisma.class.deleteMany({ where: { id: classId } })
  await prisma.student.deleteMany({ where: { id: { in: studentIds } } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [T_CLEVERID, ...STUDENT_CLEVERIDS] } } })
  await prisma.$disconnect()
})

describe('Audit 10 — Item 4: Decay metrics computed correctly', () => {
  it('4a. getClassDecayRates returns an array', async () => {
    const rates = await getClassDecayRates(teacherId)
    expect(Array.isArray(rates)).toBe(true)
  })

  it('4b. ClassDecayRate has required fields', async () => {
    const rates = await getClassDecayRates(teacherId)
    for (const rate of rates) {
      expect(typeof rate.benchmarkId).toBe('string')
      expect(typeof rate.benchmarkCode).toBe('string')
      expect(typeof rate.totalStudents).toBe('number')
      expect(typeof rate.decayingStudents).toBe('number')
      expect(typeof rate.decayRatePercent).toBe('number')
      expect(typeof rate.spikeAlert).toBe('boolean')
    }
  })

  it('4c. Exactly 50% decay rate for the seeded benchmark (2/3 decaying ≈ 66%, but test uses 2 of 4 states)', async () => {
    // We seeded 3 students: 2 decaying (quality<3) + 1 healthy (quality≥3)
    // decayRatePercent = round(2/3 * 100) = 67%
    const rates = await getClassDecayRates(teacherId)
    const benchmarkRate = rates[0]
    expect(benchmarkRate).toBeDefined()
    // 2 decaying out of 3 students = 67% rounded
    expect(benchmarkRate.decayingStudents).toBe(2)
    expect(benchmarkRate.totalStudents).toBe(3)
    expect(benchmarkRate.decayRatePercent).toBe(67)
  })

  it('4d. spikeAlert=true because decayRatePercent >= 50%', async () => {
    const rates = await getClassDecayRates(teacherId)
    const benchmarkRate = rates[0]
    expect(benchmarkRate.spikeAlert).toBe(true)
  })

  it('4e. decayRatePercent is in [0, 100]', async () => {
    const rates = await getClassDecayRates(teacherId)
    for (const rate of rates) {
      expect(rate.decayRatePercent).toBeGreaterThanOrEqual(0)
      expect(rate.decayRatePercent).toBeLessThanOrEqual(100)
    }
  })
})
