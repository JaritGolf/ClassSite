/**
 * Audit 10 — Item 1: Mastery analytics correct against hand-computed seed data.
 *
 * Sets up a cohort of test students (email prefix test-audit10-01-),
 * seeds known MASTERED rows, and verifies validateMasteryAgainstSeed returns
 * the expected mastery count for each benchmark.
 *
 * Prefix: test-audit10-01-
 */

import { PrismaClient } from '@prisma/client'
import { validateMasteryAgainstSeed } from '@/lib/eoc-analytics/validation'

const prisma = new PrismaClient()

// 3 students, 2 benchmarks
const STUDENTS = [
  { cleverId: 'test-audit10-01-s1', email: 'test-audit10-01-s1@test.invalid' },
  { cleverId: 'test-audit10-01-s2', email: 'test-audit10-01-s2@test.invalid' },
  { cleverId: 'test-audit10-01-s3', email: 'test-audit10-01-s3@test.invalid' },
]

let studentIds: string[] = []
let benchmarkIds: string[] = []

// Hand-computed expected mastered counts per benchmark:
// benchmark[0]: students 0 and 1 mastered → 2
// benchmark[1]: only student 2 mastered → 1
const EXPECTED_MASTERED: Record<string, number> = {}

beforeAll(async () => {
  // Create students
  studentIds = []
  for (const s of STUDENTS) {
    const u = await prisma.user.upsert({
      where: { cleverId: s.cleverId },
      create: { cleverId: s.cleverId, email: s.email, firstName: 'Audit10', lastName: '01', role: 'STUDENT' },
      update: {},
      select: { id: true },
    })
    const st = await prisma.student.upsert({ where: { userId: u.id }, create: { userId: u.id }, update: {}, select: { id: true } })
    studentIds.push(st.id)
  }

  // Get 2 benchmarks from DB
  const bms = await prisma.benchmark.findMany({ select: { id: true, code: true }, take: 2, orderBy: { code: 'asc' } })
  if (bms.length < 2) throw new Error('Need at least 2 benchmarks seeded')
  benchmarkIds = bms.map((b) => b.id)

  // Seed known MASTERED rows
  // benchmark[0]: students 0 and 1 mastered
  EXPECTED_MASTERED[bms[0].code] = 2
  await prisma.studentProgress.upsert({
    where: { studentId_benchmarkId: { studentId: studentIds[0], benchmarkId: benchmarkIds[0] } },
    create: { studentId: studentIds[0], benchmarkId: benchmarkIds[0], status: 'MASTERED', masteredAt: new Date() },
    update: { status: 'MASTERED', masteredAt: new Date() },
  })
  await prisma.studentProgress.upsert({
    where: { studentId_benchmarkId: { studentId: studentIds[1], benchmarkId: benchmarkIds[0] } },
    create: { studentId: studentIds[1], benchmarkId: benchmarkIds[0], status: 'MASTERED', masteredAt: new Date() },
    update: { status: 'MASTERED', masteredAt: new Date() },
  })

  // benchmark[1]: only student 2 mastered
  EXPECTED_MASTERED[bms[1].code] = 1
  await prisma.studentProgress.upsert({
    where: { studentId_benchmarkId: { studentId: studentIds[2], benchmarkId: benchmarkIds[1] } },
    create: { studentId: studentIds[2], benchmarkId: benchmarkIds[1], status: 'MASTERED', masteredAt: new Date() },
    update: { status: 'MASTERED', masteredAt: new Date() },
  })

  // student 0 NOT MASTERED benchmark[1]
  await prisma.studentProgress.upsert({
    where: { studentId_benchmarkId: { studentId: studentIds[0], benchmarkId: benchmarkIds[1] } },
    create: { studentId: studentIds[0], benchmarkId: benchmarkIds[1], status: 'IN_PROGRESS' },
    update: { status: 'IN_PROGRESS' },
  })
})

afterAll(async () => {
  await prisma.studentProgress.deleteMany({ where: { studentId: { in: studentIds } } })
  await prisma.student.deleteMany({ where: { id: { in: studentIds } } })
  await prisma.user.deleteMany({ where: { cleverId: { in: STUDENTS.map((s) => s.cleverId) } } })
  await prisma.$disconnect()
})

describe('Audit 10 — Item 1: Mastery analytics correct against hand-computed seed', () => {
  it('1a. validateMasteryAgainstSeed returns results for cohort', async () => {
    const results = await validateMasteryAgainstSeed()
    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBeGreaterThanOrEqual(1)
  })

  it('1b. All results have match=true (DB computed = expected)', async () => {
    const results = await validateMasteryAgainstSeed()
    for (const r of results) {
      expect(r.match).toBe(true)
      expect(r.actualMastered).toBe(r.expectedMastered)
    }
  })

  it('1c. Benchmark[0] shows expectedMastered = 2 (hand-computed)', async () => {
    const results = await validateMasteryAgainstSeed()
    const bm = await prisma.benchmark.findUnique({ where: { id: benchmarkIds[0] }, select: { code: true } })
    const row = results.find((r) => r.benchmarkCode === bm!.code)
    expect(row).toBeDefined()
    expect(row!.actualMastered).toBe(2)
  })

  it('1d. Benchmark[1] shows expectedMastered = 1 (hand-computed)', async () => {
    const results = await validateMasteryAgainstSeed()
    const bm = await prisma.benchmark.findUnique({ where: { id: benchmarkIds[1] }, select: { code: true } })
    const row = results.find((r) => r.benchmarkCode === bm!.code)
    expect(row).toBeDefined()
    expect(row!.actualMastered).toBe(1)
  })

  it('1e. SeedValidationResult has required fields', async () => {
    const results = await validateMasteryAgainstSeed()
    for (const r of results) {
      expect(typeof r.benchmarkCode).toBe('string')
      expect(typeof r.expectedMastered).toBe('number')
      expect(typeof r.actualMastered).toBe('number')
      expect(typeof r.match).toBe('boolean')
    }
  })
})
