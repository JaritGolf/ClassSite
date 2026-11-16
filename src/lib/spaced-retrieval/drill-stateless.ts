/**
 * Daily Drill question selection — read-only, anonymous.
 *
 * The student's device knows which benchmarks are due (SM-2 runs there). It
 * asks for one question per due benchmark; the server picks one, without the
 * answer key, and keeps nothing. The request names benchmarks and question
 * ids only.
 *
 * Mastery Challenge questions are never used: a drill answer is explained
 * right away, and those answers must not be learnable in advance.
 */

import { z } from 'zod'
import { prisma } from '@/lib/db'
import { masteryFormQuestionIds } from '@/lib/assessment/single-answer'

/** Maximum drill length per session (spec §15). */
export const DRILL_CAP = 15

export const DrillItemsSchema = z.object({
  benchmarkCodes: z.array(z.string().min(3).max(30)).min(1).max(60),
  seenQuestionIds: z.array(z.string().max(60)).max(1000).default([]),
})

export interface DrillItem {
  benchmarkCode: string
  questionId: string
  prompt: string
  itemType: string
  options: { id: string; optionText: string }[]
}

function shuffled<T>(items: readonly T[]): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** One question per requested benchmark, in the order requested, capped. */
export async function getDrillItems(input: z.infer<typeof DrillItemsSchema>): Promise<DrillItem[]> {
  const codes = [...new Set(input.benchmarkCodes)].slice(0, DRILL_CAP)
  const seen = new Set(input.seenQuestionIds)
  const masteryIds = await masteryFormQuestionIds()

  const items: DrillItem[] = []
  for (const code of codes) {
    const candidates = await prisma.question.findMany({
      where: { benchmark: { code }, approvalStatus: 'APPROVED', active: true },
      select: { id: true },
    })
    const eligible = candidates.map((c) => c.id).filter((id) => !masteryIds.has(id))
    if (eligible.length === 0) continue
    // Prefer a question this device has not seen; fall back to any.
    const unseen = eligible.filter((id) => !seen.has(id))
    const pool = unseen.length > 0 ? unseen : eligible
    const pickId = pool[Math.floor(Math.random() * pool.length)]

    const question = await prisma.question.findUnique({
      where: { id: pickId },
      select: {
        id: true,
        prompt: true,
        itemType: true,
        // id + text only — the key is never loaded on this path.
        options: { select: { id: true, optionText: true }, orderBy: { id: 'asc' } },
      },
    })
    if (!question) continue
    items.push({
      benchmarkCode: code,
      questionId: question.id,
      prompt: question.prompt,
      itemType: question.itemType,
      options: shuffled(question.options),
    })
  }
  return items
}
