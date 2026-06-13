/**
 * Audit 16 — L1 Glosses (§36.17).
 *  1. Spanish glosses present for all tier-3 vocabulary.
 *  2. Display toggles via the resolved language (l1_language / ACC-L1-*).
 *  3. Only APPROVED translations are surfaced to students.
 *  4. Haitian Creole pipeline is functional end-to-end.
 *
 * Self-seeds (idempotent): reporting categories → benchmarks → vocabulary →
 * term translations (es all tier-3 + ht sample, NEEDS_REVIEW).
 */

import { PrismaClient } from '@prisma/client'
import { seedReportingCategories } from '../../../seed/reporting_categories'
import { seedBenchmarks } from '../../../seed/benchmarks'
import { seedVocabulary } from '../../../seed/vocabulary'
import { seedTermTranslations } from '../../../seed/term_translations'
import { getGlossaryTermsForBenchmark } from '@/lib/l1-glosses'

const prisma = new PrismaClient()

beforeAll(async () => {
  await seedReportingCategories(prisma)
  await seedBenchmarks(prisma)
  await seedVocabulary(prisma)
  await seedTermTranslations(prisma)
}, 60000)

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Audit 16 — Item 1: Spanish glosses present for all tier-3 vocabulary', () => {
  it('every tier-3 term has an es TermTranslation row', async () => {
    const tier3 = await prisma.term.findMany({ where: { tier: 'TIER_3' }, select: { id: true } })
    expect(tier3.length).toBeGreaterThan(0)
    const withEs = await prisma.termTranslation.count({
      where: { languageCode: 'es', termId: { in: tier3.map((t) => t.id) } },
    })
    expect(withEs).toBe(tier3.length)
  })
})

describe('Audit 16 — Items 2 & 3: toggle + approval gate', () => {
  let benchmarkId: string
  let termId: string

  beforeAll(async () => {
    const term = await prisma.term.findFirstOrThrow({
      where: { term: 'democracy', tier: 'TIER_3' },
      select: { id: true, benchmarkId: true },
    })
    termId = term.id
    benchmarkId = term.benchmarkId!
  })

  it('3. a NEEDS_REVIEW es translation does NOT surface', async () => {
    await prisma.termTranslation.update({
      where: { termId_languageCode: { termId, languageCode: 'es' } },
      data: { approvalStatus: 'NEEDS_REVIEW' },
    })
    const terms = await getGlossaryTermsForBenchmark(benchmarkId, 'es')
    const democracy = terms.find((t) => t.term === 'democracy')
    expect(democracy).toBeDefined()
    expect(democracy?.l1Definition).toBeUndefined()
  })

  it('2/3. after approval the es gloss surfaces with l1Language=es', async () => {
    await prisma.termTranslation.update({
      where: { termId_languageCode: { termId, languageCode: 'es' } },
      data: { approvalStatus: 'APPROVED' },
    })
    const terms = await getGlossaryTermsForBenchmark(benchmarkId, 'es')
    const democracy = terms.find((t) => t.term === 'democracy')
    expect(democracy?.l1Definition).toBeTruthy()
    expect(democracy?.l1Language).toBe('es')
  })

  it('2. with no language (toggle off) no L1 gloss is attached', async () => {
    const terms = await getGlossaryTermsForBenchmark(benchmarkId, null)
    const democracy = terms.find((t) => t.term === 'democracy')
    expect(democracy).toBeDefined()
    expect(democracy?.l1Definition).toBeUndefined()
  })
})

describe('Audit 16 — Item 4: Haitian Creole pipeline functional', () => {
  it("an approved 'ht' translation surfaces end-to-end", async () => {
    const term = await prisma.term.findFirstOrThrow({
      where: { term: 'democracy', tier: 'TIER_3' },
      select: { id: true, benchmarkId: true },
    })
    // The ht proof sample includes 'democracy'.
    await prisma.termTranslation.update({
      where: { termId_languageCode: { termId: term.id, languageCode: 'ht' } },
      data: { approvalStatus: 'APPROVED' },
    })
    const terms = await getGlossaryTermsForBenchmark(term.benchmarkId!, 'ht')
    const democracy = terms.find((t) => t.term === 'democracy')
    expect(democracy?.l1Definition).toBeTruthy()
    expect(democracy?.l1Language).toBe('ht')
  })
})
