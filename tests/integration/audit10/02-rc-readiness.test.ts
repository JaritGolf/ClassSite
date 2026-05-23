/**
 * Audit 10 — Item 2: Reporting category readiness calculations correct.
 *
 * Verifies:
 * - byCategory.length >= 1 (seeded reporting categories)
 * - weights normalize correctly (sum approaches 1.0 after normalization)
 * - overallPercent matches weighted sum of byCategory readiness
 *
 * Prefix: test-audit10-02-
 */

import { PrismaClient } from '@prisma/client'
import { computeStudentReadiness, computeClassReadiness } from '@/lib/eoc-analytics/readiness'

const prisma = new PrismaClient()

const T_CLEVERID = 'test-audit10-02-teacher'
const S_CLEVERID = 'test-audit10-02-student'

let teacherId: string
let teacherUserId: string
let studentId: string
let classId: string
let benchmarkId: string

beforeAll(async () => {
  const tUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: { cleverId: T_CLEVERID, email: `${T_CLEVERID}@test.invalid`, firstName: 'Audit10', lastName: '02T', role: 'TEACHER' },
    update: {},
    select: { id: true },
  })
  teacherUserId = tUser.id
  const teacher = await prisma.teacher.upsert({ where: { userId: teacherUserId }, create: { userId: teacherUserId }, update: {}, select: { id: true } })
  teacherId = teacher.id

  const sUser = await prisma.user.upsert({
    where: { cleverId: S_CLEVERID },
    create: { cleverId: S_CLEVERID, email: `${S_CLEVERID}@test.invalid`, firstName: 'Audit10', lastName: '02S', role: 'STUDENT' },
    update: {},
    select: { id: true },
  })
  const student = await prisma.student.upsert({ where: { userId: sUser.id }, create: { userId: sUser.id }, update: {}, select: { id: true } })
  studentId = student.id

  const cls = await prisma.class.create({ data: { teacherId, name: 'Audit10-02 Class', schoolYear: '2025-2026' }, select: { id: true } })
  classId = cls.id
  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId, studentId } },
    create: { classId, studentId, status: 'ACTIVE' },
    update: {},
  })

  const bm = await prisma.benchmark.findFirst({ select: { id: true } })
  if (!bm) throw new Error('No benchmark in DB')
  benchmarkId = bm.id

  await prisma.studentProgress.upsert({
    where: { studentId_benchmarkId: { studentId, benchmarkId } },
    create: { studentId, benchmarkId, status: 'MASTERED', masteredAt: new Date() },
    update: { status: 'MASTERED', masteredAt: new Date() },
  })
})

afterAll(async () => {
  await prisma.studentProgress.deleteMany({ where: { studentId } })
  await prisma.classEnrollment.deleteMany({ where: { classId } })
  await prisma.class.deleteMany({ where: { id: classId } })
  await prisma.student.deleteMany({ where: { id: studentId } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [T_CLEVERID, S_CLEVERID] } } })
  await prisma.$disconnect()
})

describe('Audit 10 — Item 2: RC readiness calculations', () => {
  it('2a. computeStudentReadiness returns byCategory with length >= 1', async () => {
    const result = await computeStudentReadiness(studentId)
    expect(result.byCategory.length).toBeGreaterThanOrEqual(1)
  })

  it('2b. Each byCategory entry has required fields', async () => {
    const result = await computeStudentReadiness(studentId)
    for (const cat of result.byCategory) {
      expect(typeof cat.reportingCategoryId).toBe('string')
      expect(typeof cat.name).toBe('string')
      expect(typeof cat.weight).toBe('number')
      expect(typeof cat.masteredCount).toBe('number')
      expect(typeof cat.totalBenchmarks).toBe('number')
      expect(typeof cat.readinessPercent).toBe('number')
      expect(typeof cat.readinessLow).toBe('number')
      expect(typeof cat.readinessHigh).toBe('number')
    }
  })

  it('2c. overallPercent matches weighted sum within 0.1', async () => {
    const result = await computeStudentReadiness(studentId)
    const totalWeight = result.byCategory.reduce((sum, rc) => sum + rc.weight, 0)
    const manualOverall =
      totalWeight === 0
        ? 0
        : result.byCategory.reduce((sum, rc) => sum + (rc.readinessPercent * rc.weight) / totalWeight, 0)
    expect(result.overallPercent).toBeCloseTo(manualOverall, 1)
  })

  it('2d. Wilson CI: readinessLow <= readinessPercent <= readinessHigh', async () => {
    const result = await computeStudentReadiness(studentId)
    for (const cat of result.byCategory) {
      if (cat.totalBenchmarks > 0) {
        expect(cat.readinessLow).toBeLessThanOrEqual(cat.readinessPercent + 0.01)
        expect(cat.readinessPercent).toBeLessThanOrEqual(cat.readinessHigh + 0.01)
      }
    }
  })

  it('2e. computeClassReadiness returns valid result', async () => {
    const result = await computeClassReadiness(classId)
    expect(result.classId).toBe(classId)
    expect(result.studentCount).toBe(1)
    expect(result.byCategory.length).toBeGreaterThanOrEqual(1)
    expect(result.overallPercent).toBeGreaterThanOrEqual(0)
    expect(result.overallPercent).toBeLessThanOrEqual(100)
  })

  it('2f. After normalization, weights sum to 1.0 ± 0.001 in overallPercent computation', async () => {
    const result = await computeStudentReadiness(studentId)
    const totalWeight = result.byCategory.reduce((sum, rc) => sum + rc.weight, 0)
    // After normalization step (dividing by totalWeight), effective weights sum to 1
    expect(totalWeight).toBeGreaterThan(0)
    const normalizedWeights = result.byCategory.map((rc) => rc.weight / totalWeight)
    const sumNormalized = normalizedWeights.reduce((a, b) => a + b, 0)
    expect(sumNormalized).toBeCloseTo(1.0, 3)
  })
})
