/**
 * Glossary terms for a benchmark, with EVERY approved translation attached.
 *
 * The server does not know — and is never told — which language a student
 * reads. It sends the approved Spanish and Haitian Creole glosses alongside
 * the English definition, and the student's own device shows the one the
 * student picked in Settings (or none). A language choice is information about
 * a child; keeping the choice on the device means the server never holds it.
 */

import { prisma } from '@/lib/db'
import type { GlossaryTerm } from '@/lib/reading-load'

export const SUPPORTED_L1_LANGUAGES = ['es', 'ht'] as const
export type L1Language = (typeof SUPPORTED_L1_LANGUAGES)[number]

function isSupported(code: string): code is L1Language {
  return (SUPPORTED_L1_LANGUAGES as readonly string[]).includes(code)
}

/**
 * Approved tier-2 (global) and tier-3 (this benchmark) terms.
 * Display-only: glossary support never affects grading.
 */
export async function getGlossaryTermsForBenchmark(
  benchmarkId: string | null
): Promise<GlossaryTerm[]> {
  const terms = await prisma.term.findMany({
    where: {
      approvalStatus: 'APPROVED',
      tier: { in: ['TIER_2', 'TIER_3'] },
      OR: [{ benchmarkId }, { benchmarkId: null }],
    },
    select: {
      term: true,
      definition: true,
      tier: true,
      translations: {
        where: { approvalStatus: 'APPROVED', languageCode: { in: [...SUPPORTED_L1_LANGUAGES] } },
        select: { languageCode: true, definitionTranslated: true },
      },
    },
  })

  return terms.map((t) => {
    const l1Definitions: Partial<Record<L1Language, string>> = {}
    for (const tr of t.translations) {
      if (isSupported(tr.languageCode)) l1Definitions[tr.languageCode] = tr.definitionTranslated
    }
    return {
      term: t.term,
      definition: t.definition,
      tier: t.tier as 'TIER_2' | 'TIER_3',
      ...(Object.keys(l1Definitions).length > 0 ? { l1Definitions } : {}),
    }
  })
}
