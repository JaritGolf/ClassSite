/**
 * Seed: Remediation Items (Phase 15).
 *
 * Audit §36.16 item 6: "Each benchmark has at least one remediation activity per
 * major skill_tag." This seeder reads the DISTINCT (benchmark, skill_tag) pairs
 * from the seeded questions in the database and creates one RemediationItem per
 * pair — so coverage is guaranteed in sync for every unit (Unit 1 + backfill +
 * Unit 2 + future units) with no per-bank wiring.
 *
 * MUST run AFTER all question seeders. AI-drafted scaffolds → NEEDS_REVIEW.
 * Idempotent: upsert by a deterministic id.
 */

import type { PrismaClient, RemediationType } from '@prisma/client'

/** Pick a remediation activity type from the skill tag (heuristic; owner can revise). */
function remediationTypeFor(skillTag: string): RemediationType {
  if (/scenario|purpose|apply|application/.test(skillTag)) return 'SCENARIO_LAB'
  if (/source|excerpt|document|declaration/.test(skillTag)) return 'PRIMARY_SOURCE_COACH'
  if (/vocab|term/.test(skillTag)) return 'VOCABULARY_TRAINING'
  return 'BASIC_RETEACH'
}

function titleCase(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export async function seedRemediationItems(prisma: PrismaClient): Promise<void> {
  // Distinct (benchmarkId, code, skillTag) across all seeded questions.
  const questions = await prisma.question.findMany({
    select: { skillTag: true, benchmarkId: true, benchmark: { select: { code: true } } },
  })

  const pairs = new Map<string, { benchmarkId: string; code: string; skillTag: string }>()
  for (const q of questions) {
    if (!q.skillTag) continue
    const key = `${q.benchmarkId}::${q.skillTag}`
    if (!pairs.has(key)) pairs.set(key, { benchmarkId: q.benchmarkId, code: q.benchmark.code, skillTag: q.skillTag })
  }

  let count = 0
  for (const { benchmarkId, code, skillTag } of pairs.values()) {
    const id = `remitem-${code.replace(/\./g, '')}-${skillTag}`
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
          `Targeted review for the "${titleCase(skillTag)}" skill on ${code}. ` +
          `Revisits the core idea with a short explanation and guided examples before reassessment.`,
        approvalStatus: 'NEEDS_REVIEW',
      },
      update: { title: `Reteach: ${titleCase(skillTag)}`, remediationType, skillTag },
    })
    count++
  }

  console.log(`  ✓ Remediation items seeded (${count}, ≥1 per skill_tag, NEEDS_REVIEW)`)
}
