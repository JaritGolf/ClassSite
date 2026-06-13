/**
 * Build the glossary-term list for a benchmark, attaching APPROVED L1 glosses for
 * the active language. Single source of glossary terms for the Source Lab and the
 * assessment player. Only APPROVED Terms and APPROVED TermTranslations are returned
 * (spec §36.17 item 3 — reviewed/approved before student visibility).
 */

import { prisma } from '@/lib/db'
import type { GlossaryTerm } from '@/lib/reading-load'

export async function getGlossaryTermsForBenchmark(
  benchmarkId: string | null,
  languageCode: string | null
): Promise<GlossaryTerm[]> {
  const terms = await prisma.term.findMany({
    where: {
      approvalStatus: 'APPROVED',
      tier: { in: ['TIER_2', 'TIER_3'] },
      OR: [{ benchmarkId }, { benchmarkId: null }],
    },
    select: { id: true, term: true, definition: true, tier: true },
  })

  let trMap = new Map<string, string>()
  if (languageCode && terms.length > 0) {
    const translations = await prisma.termTranslation.findMany({
      where: {
        languageCode,
        approvalStatus: 'APPROVED',
        termId: { in: terms.map((t) => t.id) },
      },
      select: { termId: true, definitionTranslated: true },
    })
    trMap = new Map(translations.map((t) => [t.termId, t.definitionTranslated]))
  }

  return terms.map((t) => {
    const l1 = languageCode ? trMap.get(t.id) : undefined
    return {
      term: t.term,
      definition: t.definition,
      tier: t.tier as 'TIER_2' | 'TIER_3',
      ...(l1 ? { l1Definition: l1, l1Language: languageCode! } : {}),
    }
  })
}
