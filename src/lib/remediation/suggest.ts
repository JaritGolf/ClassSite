/**
 * Remediation suggestion — read-only.
 *
 * Given the questions a student missed on a Mastery Challenge, pick the
 * approved remediation items that address them. This used to create a
 * per-student `StudentRemediation` row; it now returns curriculum items and
 * the student's device remembers which ones it was given.
 *
 * Routing (unchanged):
 *   wrong + "Very sure"            → MISCONCEPTION_FIX
 *   wrong + tagged misconception   → MINI_LESSON_REPLAY
 *   otherwise                      → BASIC_RETEACH
 */

import { prisma } from '@/lib/db'
import type { RemediationType } from '@prisma/client'

export function selectRemediationType(
  confidence: number | null,
  hasMisconception: boolean
): RemediationType {
  if (confidence === 2) return 'MISCONCEPTION_FIX'
  if (hasMisconception) return 'MINI_LESSON_REPLAY'
  return 'BASIC_RETEACH'
}

export interface MissedQuestion {
  confidence: number | null
  skillTag: string
  misconceptionId: string | null
}

export interface RemediationSuggestion {
  itemId: string
  title: string
  remediationType: RemediationType
}

export async function suggestRemediation(
  benchmarkId: string,
  missed: MissedQuestion[]
): Promise<RemediationSuggestion[]> {
  if (missed.length === 0) return []

  type Pair = { skillTag: string; remediationType: RemediationType; misconceptionId: string | null }
  const pairs = new Map<string, Pair>()
  for (const m of missed) {
    const remediationType = selectRemediationType(m.confidence, m.misconceptionId !== null)
    const key = `${m.skillTag}|${remediationType}`
    if (!pairs.has(key)) {
      pairs.set(key, { skillTag: m.skillTag, remediationType, misconceptionId: m.misconceptionId })
    }
  }

  const select = { id: true, title: true, remediationType: true } as const
  const found = await Promise.all(
    Array.from(pairs.values()).map(async (pair) => {
      if (pair.remediationType === 'MISCONCEPTION_FIX' && pair.misconceptionId) {
        const exact = await prisma.remediationItem.findFirst({
          where: {
            benchmarkId,
            remediationType: 'MISCONCEPTION_FIX',
            misconceptionId: pair.misconceptionId,
            approvalStatus: 'APPROVED',
          },
          select,
        })
        if (exact) return exact
      }
      return prisma.remediationItem.findFirst({
        where: {
          benchmarkId,
          skillTag: pair.skillTag,
          remediationType: pair.remediationType,
          approvalStatus: 'APPROVED',
        },
        select,
      })
    })
  )

  let items = found.filter((i): i is NonNullable<typeof i> => i !== null)

  // No item for the exact skill + type: fall back to any approved item for the
  // benchmark, so a failed Mastery Challenge never leaves a student with nothing.
  if (items.length === 0) {
    const fallback = await prisma.remediationItem.findFirst({
      where: { benchmarkId, approvalStatus: 'APPROVED' },
      orderBy: { id: 'asc' },
      select,
    })
    if (fallback) items = [fallback]
  }

  const unique = new Map(items.map((i) => [i.id, i]))
  return Array.from(unique.values()).map((i) => ({
    itemId: i.id,
    title: i.title,
    remediationType: i.remediationType,
  }))
}
