/**
 * Integration Tests: Seed scripts
 *
 * Verifies:
 *   1. All seed functions run without errors on a populated DB
 *   2. Seed scripts are idempotent (second run produces identical counts)
 *   3. Key relational invariants are satisfied
 *
 * Prerequisites: DATABASE_URL must point to a running PostgreSQL instance
 *   with the Phase 1 migration already applied.
 *   Run: npm run db:migrate && npm run db:seed before running these tests,
 *   OR rely on the beforeAll hook below which calls seeds directly.
 */

import { PrismaClient } from '@prisma/client'
import { seedReportingCategories } from '../../seed/reporting_categories'
import { seedBenchmarks } from '../../seed/benchmarks'
import { seedMisconceptions } from '../../seed/misconception_inventory'
import { seedVocabulary } from '../../seed/vocabulary'
import { seedSampleQuestions } from '../../seed/sample_questions_unit_1'

const prisma = new PrismaClient()

beforeAll(async () => {
  // Run seeds once before all tests — idempotent, safe on already-seeded DB
  await seedReportingCategories(prisma)
  await seedBenchmarks(prisma)
  await seedMisconceptions(prisma)
  await seedVocabulary(prisma)
  await seedSampleQuestions(prisma)
})

afterAll(async () => {
  await prisma.$disconnect()
})

// ── Reporting Categories ──────────────────────────────────────────────────────

describe('seedReportingCategories', () => {
  it('seeds exactly 4 reporting categories', async () => {
    const count = await prisma.reportingCategory.count()
    expect(count).toBe(4)
  })

  it('each category has valid blueprint weight range', async () => {
    const cats = await prisma.reportingCategory.findMany()
    for (const cat of cats) {
      expect(cat.blueprintWeightMin).toBeGreaterThan(0)
      expect(cat.blueprintWeightMax).toBeGreaterThanOrEqual(cat.blueprintWeightMin)
      expect(cat.blueprintWeightMax).toBeLessThanOrEqual(1)
    }
  })

  it('is idempotent — second run produces same count', async () => {
    await seedReportingCategories(prisma)
    const count = await prisma.reportingCategory.count()
    expect(count).toBe(4)
  })
})

// ── Units ─────────────────────────────────────────────────────────────────────

describe('seedBenchmarks (units)', () => {
  it('seeds exactly 7 units', async () => {
    const count = await prisma.unit.count()
    expect(count).toBe(7)
  })

  it('Unit 1 is active; Units 2–7 are inactive', async () => {
    const unit1 = await prisma.unit.findUnique({ where: { id: 'unit-1' } })
    expect(unit1?.active).toBe(true)

    const inactiveCount = await prisma.unit.count({ where: { active: false } })
    expect(inactiveCount).toBe(6)
  })

  it('is idempotent — second run produces same unit count', async () => {
    await seedBenchmarks(prisma)
    const count = await prisma.unit.count()
    expect(count).toBe(7)
  })
})

// ── Benchmarks ────────────────────────────────────────────────────────────────

describe('seedBenchmarks (benchmarks)', () => {
  it('seeds exactly 6 Unit 1 benchmarks', async () => {
    const count = await prisma.benchmark.count({ where: { unitId: 'unit-1' } })
    expect(count).toBe(6)
  })

  it('all Unit 1 benchmarks have the correct codes', async () => {
    const codes = await prisma.benchmark.findMany({
      where: { unitId: 'unit-1' },
      select: { code: true },
      orderBy: { sequenceOrder: 'asc' },
    })
    expect(codes.map((b) => b.code)).toEqual([
      'SS.7.CG.1.1',
      'SS.7.CG.1.2',
      'SS.7.CG.1.3',
      'SS.7.CG.1.4',
      'SS.7.CG.1.5',
      'SS.7.CG.1.6',
    ])
  })

  it('each benchmark has at least 1 clarification', async () => {
    const benchmarks = await prisma.benchmark.findMany({
      where: { unitId: 'unit-1' },
      include: { _count: { select: { clarifications: true } } },
    })
    for (const bm of benchmarks) {
      expect(bm._count.clarifications).toBeGreaterThanOrEqual(1)
    }
  })

  it('each benchmark is linked to the Origins reporting category', async () => {
    const originsCategory = await prisma.reportingCategory.findUnique({
      where: { name: 'Origins and Purposes of Law and Government' },
    })
    const count = await prisma.benchmark.count({
      where: { unitId: 'unit-1', reportingCategoryId: originsCategory!.id },
    })
    expect(count).toBe(6)
  })

  it('seeds 13 accommodations', async () => {
    // 6 original + 2 Phase 7 (ELL, BELOW-GRADE-READER) + 5 Phase 12 (BREAKS,
    // SCREEN-READER, HIGH-CONTRAST, LARGE-TEXT, CONTEXT-BOOST)
    const count = await prisma.accommodation.count()
    expect(count).toBe(13)
  })

  it('is idempotent — second run produces same benchmark count', async () => {
    await seedBenchmarks(prisma)
    const count = await prisma.benchmark.count()
    expect(count).toBe(6)
  })
})

// ── Misconceptions ────────────────────────────────────────────────────────────

describe('seedMisconceptions', () => {
  it('seeds exactly 50 misconceptions', async () => {
    const count = await prisma.misconception.count()
    expect(count).toBe(50)
  })

  it('misconception codes follow expected pattern', async () => {
    const codes = await prisma.misconception.findMany({ select: { code: true } })
    const pattern = /^M-(OPLG|RRC|GPPP|OFG)-\d{2}$/
    for (const { code } of codes) {
      expect(code).toMatch(pattern)
    }
  })

  it('all misconceptions have a reporting category', async () => {
    // reportingCategoryId is NOT NULL in schema — verify every row has a non-empty value
    const misconceptions = await prisma.misconception.findMany({
      select: { reportingCategoryId: true },
    })
    for (const m of misconceptions) {
      expect(m.reportingCategoryId).toBeTruthy()
    }
  })

  it('is idempotent — second run produces same count', async () => {
    await seedMisconceptions(prisma)
    const count = await prisma.misconception.count()
    expect(count).toBe(50)
  })
})

// ── Vocabulary ────────────────────────────────────────────────────────────────

describe('seedVocabulary', () => {
  it('seeds at least 80 terms', async () => {
    const count = await prisma.term.count()
    expect(count).toBeGreaterThanOrEqual(80)
  })

  it('seeds both TIER_2 and TIER_3 terms', async () => {
    const tier2 = await prisma.term.count({ where: { tier: 'TIER_2' } })
    const tier3 = await prisma.term.count({ where: { tier: 'TIER_3' } })
    expect(tier2).toBeGreaterThan(0)
    expect(tier3).toBeGreaterThan(0)
  })

  it('is idempotent — second run produces same count', async () => {
    const beforeCount = await prisma.term.count()
    await seedVocabulary(prisma)
    const afterCount = await prisma.term.count()
    expect(afterCount).toBe(beforeCount)
  })
})

// ── Sample Questions ──────────────────────────────────────────────────────────

describe('seedSampleQuestions', () => {
  it('seeds exactly 90 questions', async () => {
    const count = await prisma.question.count()
    expect(count).toBe(90)
  })

  it('seeds exactly 360 question options (4 per question)', async () => {
    const count = await prisma.questionOption.count()
    expect(count).toBe(360)
  })

  it('each question has exactly 1 correct option', async () => {
    const questions = await prisma.question.findMany({
      include: { _count: { select: { options: true } } },
    })
    for (const q of questions) {
      const correctCount = await prisma.questionOption.count({
        where: { questionId: q.id, isCorrect: true },
      })
      expect(correctCount).toBe(1)
    }
  })

  it('each question has exactly 4 options', async () => {
    const questions = await prisma.question.findMany({
      include: { _count: { select: { options: true } } },
    })
    for (const q of questions) {
      expect(q._count.options).toBe(4)
    }
  })

  it('all questions have a valid externalKey', async () => {
    const questions = await prisma.question.findMany({ select: { externalKey: true } })
    const pattern = /^q-SS7CG1[1-6]-\d{3}$/
    for (const q of questions) {
      expect(q.externalKey).toMatch(pattern)
    }
  })

  it('each benchmark has exactly 15 questions', async () => {
    const benchmarkCodes = [
      'SS.7.CG.1.1', 'SS.7.CG.1.2', 'SS.7.CG.1.3',
      'SS.7.CG.1.4', 'SS.7.CG.1.5', 'SS.7.CG.1.6',
    ]
    for (const code of benchmarkCodes) {
      const bm = await prisma.benchmark.findUnique({ where: { code } })
      const count = await prisma.question.count({ where: { benchmarkId: bm!.id } })
      expect(count).toBe(15)
    }
  })

  it('cognitive complexity distribution: each benchmark has 3 LOW, 9 MODERATE, 3 HIGH', async () => {
    const benchmarkCodes = [
      'SS.7.CG.1.1', 'SS.7.CG.1.2', 'SS.7.CG.1.3',
      'SS.7.CG.1.4', 'SS.7.CG.1.5', 'SS.7.CG.1.6',
    ]
    for (const code of benchmarkCodes) {
      const bm = await prisma.benchmark.findUnique({ where: { code } })
      const low = await prisma.question.count({ where: { benchmarkId: bm!.id, cognitiveComplexity: 'LOW' } })
      const mod = await prisma.question.count({ where: { benchmarkId: bm!.id, cognitiveComplexity: 'MODERATE' } })
      const high = await prisma.question.count({ where: { benchmarkId: bm!.id, cognitiveComplexity: 'HIGH' } })
      expect(low).toBe(3)
      expect(mod).toBe(9)
      expect(high).toBe(3)
    }
  })

  it('reading load distribution: each benchmark has 5 L1, 7 L2, 3 L3', async () => {
    const benchmarkCodes = [
      'SS.7.CG.1.1', 'SS.7.CG.1.2', 'SS.7.CG.1.3',
      'SS.7.CG.1.4', 'SS.7.CG.1.5', 'SS.7.CG.1.6',
    ]
    for (const code of benchmarkCodes) {
      const bm = await prisma.benchmark.findUnique({ where: { code } })
      const l1 = await prisma.question.count({ where: { benchmarkId: bm!.id, readingLoadLevel: 1 } })
      const l2 = await prisma.question.count({ where: { benchmarkId: bm!.id, readingLoadLevel: 2 } })
      const l3 = await prisma.question.count({ where: { benchmarkId: bm!.id, readingLoadLevel: 3 } })
      expect(l1).toBe(5)
      expect(l2).toBe(7)
      expect(l3).toBe(3)
    }
  })

  it('all questions have sourceTier B and approvalStatus APPROVED', async () => {
    const wrongTier = await prisma.question.count({ where: { NOT: { sourceTier: 'B' } } })
    const wrongStatus = await prisma.question.count({ where: { NOT: { approvalStatus: 'APPROVED' } } })
    expect(wrongTier).toBe(0)
    expect(wrongStatus).toBe(0)
  })

  it('is idempotent — second run produces same counts', async () => {
    await seedSampleQuestions(prisma)
    const qCount = await prisma.question.count()
    const oCount = await prisma.questionOption.count()
    expect(qCount).toBe(90)
    expect(oCount).toBe(360)
  })
})
