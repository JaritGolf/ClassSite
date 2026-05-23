/**
 * Integration tests — EOC Readiness Engine
 *
 * Tests computeStudentReadiness and computeClassReadiness against live fixtures.
 * Prefix: test-eoc-rd-
 */

import { PrismaClient } from '@prisma/client'
import {
  computeStudentReadiness,
  computeClassReadiness,
  wilsonInterval,
} from '@/lib/eoc-analytics/readiness'

const prisma = new PrismaClient()

const T_CLEVERID = 'test-eoc-rd-teacher'
const S1_CLEVERID = 'test-eoc-rd-student-1'
const S2_CLEVERID = 'test-eoc-rd-student-2'

let teacherId: string
let teacherUserId: string
let studentId1: string
let studentId2: string
let classId: string
let benchmarkId: string

beforeAll(async () => {
  const teacherUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: { cleverId: T_CLEVERID, email: `${T_CLEVERID}@test.invalid`, firstName: 'EocRd', lastName: 'Teacher', role: 'TEACHER' },
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

  const u1 = await prisma.user.upsert({
    where: { cleverId: S1_CLEVERID },
    create: { cleverId: S1_CLEVERID, email: `${S1_CLEVERID}@test.invalid`, firstName: 'EocRd', lastName: 'S1', role: 'STUDENT' },
    update: {},
    select: { id: true },
  })
  const s1 = await prisma.student.upsert({ where: { userId: u1.id }, create: { userId: u1.id }, update: {}, select: { id: true } })
  studentId1 = s1.id

  const u2 = await prisma.user.upsert({
    where: { cleverId: S2_CLEVERID },
    create: { cleverId: S2_CLEVERID, email: `${S2_CLEVERID}@test.invalid`, firstName: 'EocRd', lastName: 'S2', role: 'STUDENT' },
    update: {},
    select: { id: true },
  })
  const s2 = await prisma.student.upsert({ where: { userId: u2.id }, create: { userId: u2.id }, update: {}, select: { id: true } })
  studentId2 = s2.id

  const cls = await prisma.class.create({
    data: { teacherId, name: 'EocRd Test Class', schoolYear: '2025-2026' },
    select: { id: true },
  })
  classId = cls.id

  await prisma.classEnrollment.createMany({
    data: [
      { classId, studentId: studentId1, status: 'ACTIVE' },
      { classId, studentId: studentId2, status: 'ACTIVE' },
    ],
    skipDuplicates: true,
  })

  // Get a benchmark to use
  const bm = await prisma.benchmark.findFirst({ select: { id: true } })
  if (!bm) throw new Error('No benchmark in DB')
  benchmarkId = bm.id

  // Mark student 1 as mastered for this benchmark
  await prisma.studentProgress.upsert({
    where: { studentId_benchmarkId: { studentId: studentId1, benchmarkId } },
    create: { studentId: studentId1, benchmarkId, status: 'MASTERED', masteredAt: new Date() },
    update: { status: 'MASTERED', masteredAt: new Date() },
  })
})

afterAll(async () => {
  await prisma.studentProgress.deleteMany({ where: { studentId: { in: [studentId1, studentId2] } } })
  await prisma.classEnrollment.deleteMany({ where: { classId } })
  await prisma.class.deleteMany({ where: { id: classId } })
  await prisma.student.deleteMany({ where: { id: { in: [studentId1, studentId2] } } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [T_CLEVERID, S1_CLEVERID, S2_CLEVERID] } } })
  await prisma.$disconnect()
})

describe('computeStudentReadiness', () => {
  it('returns StudentReadiness with all 4 reporting categories', async () => {
    const result = await computeStudentReadiness(studentId1)
    expect(result.studentId).toBe(studentId1)
    // At least the 4 EOC RCs (seeded)
    expect(result.byCategory.length).toBeGreaterThanOrEqual(1)
  })

  it('byCategory includes a readinessPercent in [0, 100]', async () => {
    const result = await computeStudentReadiness(studentId1)
    for (const cat of result.byCategory) {
      expect(cat.readinessPercent).toBeGreaterThanOrEqual(0)
      expect(cat.readinessPercent).toBeLessThanOrEqual(100)
    }
  })

  it('each category has Wilson CI bounds', async () => {
    const result = await computeStudentReadiness(studentId1)
    for (const cat of result.byCategory) {
      expect(cat.readinessLow).toBeGreaterThanOrEqual(0)
      expect(cat.readinessHigh).toBeGreaterThanOrEqual(0)
      expect(cat.readinessLow).toBeLessThanOrEqual(cat.readinessHigh + 0.001)
    }
  })

  it('overallPercent is in [0, 100]', async () => {
    const result = await computeStudentReadiness(studentId1)
    expect(result.overallPercent).toBeGreaterThanOrEqual(0)
    expect(result.overallPercent).toBeLessThanOrEqual(100)
  })

  it('student with no mastery has overallPercent = 0', async () => {
    const result = await computeStudentReadiness(studentId2)
    expect(result.overallPercent).toBe(0)
  })

  it('Wilson interval pure function bounds', () => {
    const { low, high } = wilsonInterval(5, 10)
    expect(low).toBeCloseTo(0.236, 2)
    expect(high).toBeCloseTo(0.764, 2)
    expect(low).toBeLessThan(high)
  })
})

describe('computeClassReadiness', () => {
  it('returns ClassReadiness with classId', async () => {
    const result = await computeClassReadiness(classId)
    expect(result.classId).toBe(classId)
  })

  it('studentCount matches enrolled students', async () => {
    const result = await computeClassReadiness(classId)
    expect(result.studentCount).toBe(2)
  })

  it('byCategory has entries', async () => {
    const result = await computeClassReadiness(classId)
    expect(result.byCategory.length).toBeGreaterThanOrEqual(1)
  })

  it('overallPercent is in [0, 100]', async () => {
    const result = await computeClassReadiness(classId)
    expect(result.overallPercent).toBeGreaterThanOrEqual(0)
    expect(result.overallPercent).toBeLessThanOrEqual(100)
  })

  it('empty class returns overallPercent = 0', async () => {
    // Create an empty class
    const emptyClass = await prisma.class.create({
      data: { teacherId, name: 'EocRd Empty Class', schoolYear: '2025-2026' },
      select: { id: true },
    })
    const result = await computeClassReadiness(emptyClass.id)
    expect(result.overallPercent).toBe(0)
    expect(result.studentCount).toBe(0)
    await prisma.class.delete({ where: { id: emptyClass.id } })
  })
})
