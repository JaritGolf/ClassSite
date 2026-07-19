/**
 * Integration Tests — getBenchmarkDescription
 *
 * Confirms the teacher benchmark detail page's description source surfaces
 * the verbatim official standard statement (persisted via the
 * add_benchmark_official_statement migration) alongside the lesson summary,
 * ordered clarifications, and curriculum context.
 */

import { PrismaClient } from '@prisma/client'
import { getBenchmarkDescription } from '@/lib/benchmark-analytics'

const prisma = new PrismaClient()

let benchmarkId: string
let benchmarkCode: string

beforeAll(async () => {
  const benchmark = await prisma.benchmark.findFirst({
    where: { officialStatement: { not: null } },
    select: { id: true, code: true },
  })
  if (!benchmark) throw new Error('No benchmark with officialStatement — run seed first')
  benchmarkId = benchmark.id
  benchmarkCode = benchmark.code
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('getBenchmarkDescription', () => {
  it('returns the verbatim official statement', async () => {
    const description = await getBenchmarkDescription(benchmarkId)
    expect(description.benchmarkId).toBe(benchmarkId)
    expect(description.benchmarkCode).toBe(benchmarkCode)
    expect(typeof description.officialStatement).toBe('string')
    expect(description.officialStatement!.length).toBeGreaterThan(0)
  })

  it('returns the lesson summary and ordered clarifications', async () => {
    const description = await getBenchmarkDescription(benchmarkId)
    expect(typeof description.lessonSummary).toBe('string')
    expect(Array.isArray(description.clarifications)).toBe(true)
    expect(description.clarifications.length).toBeGreaterThan(0)
    for (const text of description.clarifications) {
      expect(typeof text).toBe('string')
    }
  })

  it('returns reporting-category and unit context', async () => {
    const description = await getBenchmarkDescription(benchmarkId)
    expect(typeof description.reportingCategoryName).toBe('string')
    expect(description.reportingCategoryName.length).toBeGreaterThan(0)
    expect(typeof description.unitTitle).toBe('string')
    expect(description.unitTitle.length).toBeGreaterThan(0)
  })

  it('throws for a nonexistent benchmark id', async () => {
    await expect(getBenchmarkDescription('nonexistent-id')).rejects.toThrow()
  })
})
