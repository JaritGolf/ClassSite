/**
 * Integration Tests — Benchmark Performance
 *
 * Tests that benchmark analytics functions return correct shapes
 * and reading-load + complexity breakdowns are present.
 *
 * Prefix: test-9b-bp- to avoid collision.
 */

import { PrismaClient } from '@prisma/client'
import {
  getBenchmarkClassPerformance,
  getPerformanceByReadingLoad,
  getPerformanceByComplexity,
  getPerformanceByStimulusType,
  getDistractorsByMisconception,
  getStudentsInRemediation,
  getBenchmarkSpacedHealth,
} from '@/lib/benchmark-analytics'

const prisma = new PrismaClient()

let teacherUserId: string
let teacherId: string
let classId: string
let studentId: string
let benchmarkId: string

const T_CLEVERID = 'test-9b-bp-teacher-001'
const S_CLEVERID = 'test-9b-bp-student-001'

beforeAll(async () => {
  // Get an existing benchmark
  const benchmark = await prisma.benchmark.findFirst({ select: { id: true, code: true } })
  if (!benchmark) throw new Error('No benchmarks in DB — run seed first')
  benchmarkId = benchmark.id

  // Teacher
  const teacherUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: {
      cleverId: T_CLEVERID,
      email: `${T_CLEVERID}@test.invalid`,
      firstName: '9BBp', lastName: 'Teacher',
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

  // Student
  const studentUser = await prisma.user.upsert({
    where: { cleverId: S_CLEVERID },
    create: {
      cleverId: S_CLEVERID,
      email: `${S_CLEVERID}@test.invalid`,
      firstName: '9BBp', lastName: 'Student',
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

  // Class
  const cls = await prisma.class.create({
    data: {
      teacherId,
      name: '9BBp Test Class',
      schoolYear: '2025-2026',
    },
    select: { id: true },
  })
  classId = cls.id

  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId, studentId } },
    create: { classId, studentId, status: 'ACTIVE' },
    update: {},
  })
})

afterAll(async () => {
  await prisma.classEnrollment.deleteMany({ where: { classId } })
  await prisma.class.deleteMany({ where: { id: classId } })
  await prisma.student.deleteMany({ where: { id: studentId } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [T_CLEVERID, S_CLEVERID] } } })
  await prisma.$disconnect()
})

describe('getBenchmarkClassPerformance', () => {
  it('returns a BenchmarkOverview with correct shape', async () => {
    const overview = await getBenchmarkClassPerformance(teacherUserId, benchmarkId)
    expect(overview.benchmarkId).toBe(benchmarkId)
    expect(typeof overview.benchmarkCode).toBe('string')
    expect(typeof overview.title).toBe('string')
    expect(typeof overview.reportingCategoryName).toBe('string')
    expect(typeof overview.classMasteryRatePercent).toBe('number')
    expect(Array.isArray(overview.averageScoreByAttempt)).toBe(true)
    expect(typeof overview.studentsInRemediationCount).toBe('number')
  })

  it('returns classMasteryRatePercent as 0 when no progress rows', async () => {
    const overview = await getBenchmarkClassPerformance(teacherUserId, benchmarkId)
    expect(overview.classMasteryRatePercent).toBe(0)
  })
})

describe('getPerformanceByReadingLoad', () => {
  it('returns DimensionBreakdown with rows for levels 1, 2, 3', async () => {
    const result = await getPerformanceByReadingLoad(teacherUserId, benchmarkId)
    expect(result.rows).toHaveLength(3)
    const keys = result.rows.map((r) => r.key)
    expect(keys).toContain('1')
    expect(keys).toContain('2')
    expect(keys).toContain('3')
  })

  it('all correctRate values are numeric and ≥ 0', async () => {
    const result = await getPerformanceByReadingLoad(teacherUserId, benchmarkId)
    for (const row of result.rows) {
      expect(typeof row.correctRate).toBe('number')
      expect(row.correctRate).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('getPerformanceByComplexity', () => {
  it('returns rows for LOW, MODERATE, HIGH', async () => {
    const result = await getPerformanceByComplexity(teacherUserId, benchmarkId)
    expect(result.rows).toHaveLength(3)
    const keys = result.rows.map((r) => r.key)
    expect(keys).toContain('LOW')
    expect(keys).toContain('MODERATE')
    expect(keys).toContain('HIGH')
  })
})

describe('getPerformanceByStimulusType', () => {
  it('returns an array (possibly empty if no responses)', async () => {
    const result = await getPerformanceByStimulusType(teacherUserId, benchmarkId)
    expect(Array.isArray(result.rows)).toBe(true)
  })
})

describe('getDistractorsByMisconception', () => {
  it('returns an array', async () => {
    const result = await getDistractorsByMisconception(teacherUserId, benchmarkId)
    expect(Array.isArray(result)).toBe(true)
  })
})

describe('getStudentsInRemediation', () => {
  it('returns an array', async () => {
    const result = await getStudentsInRemediation(teacherUserId, benchmarkId)
    expect(Array.isArray(result)).toBe(true)
  })
})

describe('getBenchmarkSpacedHealth', () => {
  it('returns BenchmarkSpacedHealth with correct shape', async () => {
    const result = await getBenchmarkSpacedHealth(teacherUserId, benchmarkId)
    expect(typeof result.totalStudents).toBe('number')
    expect(typeof result.decayingStudents).toBe('number')
    expect(typeof result.decayRatePercent).toBe('number')
    expect(typeof result.avgIntervalDays).toBe('number')
    expect(typeof result.itemsDueNow).toBe('number')
  })
})
