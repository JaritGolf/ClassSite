/**
 * Audit 9 — Item 2: Benchmark dashboard breaks down by reading-load level and shows decay.
 *
 * Asserts:
 *   - getPerformanceByReadingLoad returns rows for levels 1, 2, 3
 *   - getPerformanceByComplexity returns rows for LOW, MODERATE, HIGH
 *   - getBenchmarkSpacedHealth returns correct shape with decayRatePercent field
 */

import { PrismaClient } from '@prisma/client'
import {
  getPerformanceByReadingLoad,
  getPerformanceByComplexity,
  getBenchmarkSpacedHealth,
  getBenchmarkClassPerformance,
} from '@/lib/benchmark-analytics'

const prisma = new PrismaClient()

let teacherUserId: string
let teacherId: string
let classId: string
let studentId: string
let benchmarkId: string

const T_CLEVERID = 'test-audit9-02-teacher'
const S_CLEVERID = 'test-audit9-02-student'

beforeAll(async () => {
  // Get a benchmark
  const benchmark = await prisma.benchmark.findFirst({ select: { id: true, code: true } })
  if (!benchmark) throw new Error('No benchmarks in DB')
  benchmarkId = benchmark.id

  // Teacher
  const teacherUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: {
      cleverId: T_CLEVERID,
      email: `${T_CLEVERID}@test.invalid`,
      firstName: 'Audit9-02', lastName: 'Teacher',
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
      firstName: 'Audit9-02', lastName: 'Student',
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
    data: { teacherId, name: 'Audit 9-02 Test Class', schoolYear: '2025-2026' },
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

describe('Audit 9 Item 2 — Benchmark reading-load and decay breakdown', () => {
  it('2a. getPerformanceByReadingLoad returns rows for levels 1, 2, 3', async () => {
    const result = await getPerformanceByReadingLoad(teacherUserId, benchmarkId)
    expect(result.rows).toHaveLength(3)
    const keys = result.rows.map((r) => r.key)
    expect(keys).toContain('1')
    expect(keys).toContain('2')
    expect(keys).toContain('3')
    for (const row of result.rows) {
      expect(typeof row.correctRate).toBe('number')
      expect(typeof row.sampleSize).toBe('number')
    }
  })

  it('2b. getPerformanceByComplexity returns rows for LOW, MODERATE, HIGH', async () => {
    const result = await getPerformanceByComplexity(teacherUserId, benchmarkId)
    expect(result.rows).toHaveLength(3)
    const keys = result.rows.map((r) => r.key)
    expect(keys).toContain('LOW')
    expect(keys).toContain('MODERATE')
    expect(keys).toContain('HIGH')
  })

  it('2c. getBenchmarkSpacedHealth returns decay fields', async () => {
    const health = await getBenchmarkSpacedHealth(teacherUserId, benchmarkId)
    expect(typeof health.totalStudents).toBe('number')
    expect(typeof health.decayingStudents).toBe('number')
    expect(typeof health.decayRatePercent).toBe('number')
    expect(typeof health.avgIntervalDays).toBe('number')
    expect(typeof health.itemsDueNow).toBe('number')
    // Decay rate must be 0–100
    expect(health.decayRatePercent).toBeGreaterThanOrEqual(0)
    expect(health.decayRatePercent).toBeLessThanOrEqual(100)
  })

  it('2d. getBenchmarkClassPerformance returns overview with mastery rate', async () => {
    const overview = await getBenchmarkClassPerformance(teacherUserId, benchmarkId)
    expect(overview.benchmarkId).toBe(benchmarkId)
    expect(typeof overview.classMasteryRatePercent).toBe('number')
    expect(overview.classMasteryRatePercent).toBeGreaterThanOrEqual(0)
    expect(overview.classMasteryRatePercent).toBeLessThanOrEqual(100)
  })
})
