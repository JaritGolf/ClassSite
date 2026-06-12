/**
 * Seed: Remediation Items (Phase 15).
 *
 * Audit §36.16 item 6: "Each benchmark has at least one remediation activity per
 * major skill_tag." This seeder derives the (benchmark, skill_tag) pairs directly
 * from the seeded question banks, so coverage is guaranteed in sync as units fill
 * in — every skill_tag that appears on a question gets a remediation activity.
 *
 * AI-drafted scaffolds → approvalStatus NEEDS_REVIEW (owner reviews before use).
 * Idempotent: upsert by a deterministic id.
 */

import type { PrismaClient, RemediationType } from '@prisma/client'
import { UNIT2_QUESTIONS_BY_BENCHMARK } from './questions/unit2'
import type { QuestionSeedDef } from './questions/_seeder'

/** Pick a remediation activity type from the skill tag (heuristic; owner can revise). */
function remediationTypeFor(skillTag: string): RemediationType {
  if (/scenario|purpose|apply|application/.test(skillTag)) return 'SCENARIO_LAB'
  if (/source|excerpt|document/.test(skillTag)) return 'PRIMARY_SOURCE_COACH'
  if (/vocab|term/.test(skillTag)) return 'VOCABULARY_TRAINING'
  return 'BASIC_RETEACH'
}

function titleCase(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** All question banks contributing skill tags. Extend as more units land. */
const QUESTION_BANKS: Array<Record<string, QuestionSeedDef[]>> = [UNIT2_QUESTIONS_BY_BENCHMARK]

export async function seedRemediationItems(prisma: PrismaClient): Promise<void> {
  const benchmarks = await prisma.benchmark.findMany({ select: { id: true, code: true } })
  const bmMap = new Map(benchmarks.map((b) => [b.code, b.id]))

  // Collect distinct (benchmarkCode, skillTag) pairs across all banks.
  const pairs = new Map<string, { benchmarkCode: string; skillTag: string }>()
  for (const bank of QUESTION_BANKS) {
    for (const [benchmarkCode, defs] of Object.entries(bank)) {
      for (const q of defs) {
        const key = `${benchmarkCode}::${q.skillTag}`
        if (!pairs.has(key)) pairs.set(key, { benchmarkCode, skillTag: q.skillTag })
      }
    }
  }

  let count = 0
  for (const { benchmarkCode, skillTag } of pairs.values()) {
    const benchmarkId = bmMap.get(benchmarkCode)
    if (!benchmarkId) continue
    const id = `remitem-${benchmarkCode.replace(/\./g, '')}-${skillTag}`
    const remediationType = remediationTypeFor(skillTag)
    await prisma.remediationItem.upsert({
      where: { id },
      create: {
        id,
        benchmarkId,
        title: `Reteach: ${titleCase(skillTag)}`,
        remediationType,
        skillTag,
        content:
          `Targeted review for the "${titleCase(skillTag)}" skill on ${benchmarkCode}. ` +
          `Revisits the core idea with a short explanation and guided examples before reassessment.`,
        approvalStatus: 'NEEDS_REVIEW',
      },
      update: {
        title: `Reteach: ${titleCase(skillTag)}`,
        remediationType,
        skillTag,
      },
    })
    count++
  }

  console.log(`  ✓ Remediation items seeded (${count}, ≥1 per skill_tag, NEEDS_REVIEW)`)
}
