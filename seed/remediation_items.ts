/**
 * Seed: Remediation Items (Phase 15 + ADR 0013).
 *
 * Audit §36.16 item 6: "Each benchmark has at least one remediation activity per
 * major skill_tag." This seeder reads the DISTINCT (benchmark, skill_tag) pairs
 * from the seeded questions in the database and creates one RemediationItem per
 * pair — so coverage is guaranteed in sync for every unit with no per-bank wiring.
 *
 * Authored reteach content (seed/remediation/) wins where it exists: real
 * concept + examples/non-examples + try-it JSON, seeded under the owner's
 * approval directive (seed/approval_mode.ts). Unauthored pairs keep the
 * generated placeholder scaffold at NEEDS_REVIEW, so coverage never regresses
 * while authoring catches up unit by unit.
 *
 * MUST run AFTER all question seeders. Idempotent: upsert by deterministic id.
 */

import type { PrismaClient, RemediationType } from '@prisma/client'
import { CONTENT_APPROVAL } from './approval_mode'
import { REMEDIATION_CONTENT, remediationKey } from './remediation/_content'

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

  let authored = 0
  let placeholders = 0
  for (const { benchmarkId, code, skillTag } of pairs.values()) {
    const id = `remitem-${code.replace(/\./g, '')}-${skillTag}`
    const def = REMEDIATION_CONTENT.get(remediationKey(code, skillTag))

    if (def) {
      const data = {
        title: def.title,
        remediationType: def.remediationType,
        skillTag,
        content: JSON.stringify(def.content),
        approvalStatus: CONTENT_APPROVAL.approvalStatus,
      }
      await prisma.remediationItem.upsert({
        where: { id },
        create: { id, benchmarkId, ...data },
        update: data,
      })
      authored++
    } else {
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
      placeholders++
    }
  }

  console.log(
    `  ✓ Remediation items seeded (${authored} authored ${CONTENT_APPROVAL.approvalStatus}, ${placeholders} placeholder NEEDS_REVIEW)`
  )
}
