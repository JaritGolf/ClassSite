/**
 * My Civics Class — Master Seed Entry Point
 *
 * Dependency order:
 *   1. reporting_categories  (no deps)
 *   2. benchmarks            (depends on reporting_categories)
 *   3. misconceptions        (depends on reporting_categories)
 *   4. vocabulary            (depends on benchmarks)
 *   5. sample_questions      (depends on benchmarks, reporting_categories, misconceptions)
 *   6. stimuli_unit1         (depends on sample_questions — attaches stimulusId to questions)
 *
 * Idempotent: safe to run multiple times. Run: npm run db:seed
 */

import { PrismaClient } from '@prisma/client'
import { seedReportingCategories } from './reporting_categories'
import { seedBenchmarks } from './benchmarks'
import { seedMisconceptions } from './misconception_inventory'
import { seedVocabulary } from './vocabulary'
import { seedTermTranslations } from './term_translations'
import { seedLessons } from './lessons'
import { seedSampleQuestions } from './sample_questions_unit_1'
import { seedUnit1Backfill } from './questions/unit1_backfill'
import { seedUnit1Interim } from './questions/unit1_interim'
import { seedUnit2Questions } from './questions/unit2'
import { seedRemediationItems } from './remediation_items'
import { seedStimuliUnit1 } from './stimuli_unit1'
import { seedVisualStimuli } from './stimuli_visuals'
import { seedBadges } from './badges'
import { seedMissionAssessments } from './assessments'

const prisma = new PrismaClient()

/**
 * The seed pipeline, in dependency order.
 *
 * Named stages exist so a single one can be run on its own:
 *
 *     npm run db:seed -- --only=badges
 *
 * That matters more than it looks. A full `db:seed` ends in `assessments`,
 * which RECONCILES existing rows — it rewrites the AssessmentQuestion set of
 * every live assessment in place. That is correct and idempotent, but it is a
 * lot of blast radius to accept in order to ship a four-string fix to a badge
 * definition. Stages are otherwise unchanged and still run in this order by
 * default, so `npm run db:seed` behaves exactly as before.
 *
 * Every stage is idempotent, so running one alone is always safe. The ORDER is
 * not arbitrary, though: running `assessments` without its question banks, or
 * `remediation` before the banks exist, will under-produce rather than fail
 * loudly. When in doubt, run the whole thing.
 */
const STAGES: { name: string; label: string; run: () => Promise<unknown> }[] = [
  { name: 'reporting-categories', label: 'Reporting categories', run: () => seedReportingCategories(prisma) },
  { name: 'benchmarks', label: 'Benchmarks, units, accommodations', run: () => seedBenchmarks(prisma) },
  { name: 'misconceptions', label: 'Misconception inventory', run: () => seedMisconceptions(prisma) },
  { name: 'vocabulary', label: 'Vocabulary', run: () => seedVocabulary(prisma) },
  { name: 'translations', label: 'L1 term translations (Spanish all tier-3 + Haitian Creole sample)', run: () => seedTermTranslations(prisma) },
  { name: 'lessons', label: 'Lessons (guided instruction per benchmark — ADR 0013)', run: () => seedLessons(prisma) },
  { name: 'questions-unit1', label: 'Sample questions (Unit 1, original 15/benchmark)', run: () => seedSampleQuestions(prisma) },
  { name: 'questions-unit1-backfill', label: 'Unit 1 backfill (→ 30/benchmark, APPROVED per ADR 0013)', run: () => seedUnit1Backfill(prisma) },
  { name: 'questions-unit1-interim', label: 'Unit 1 interim banks (official 1.1/1.2 — ADR 0017)', run: () => seedUnit1Interim(prisma) },
  { name: 'questions-unit2', label: 'Unit 2 question bank (Phase 15, Tier C / NEEDS_REVIEW)', run: () => seedUnit2Questions(prisma) },
  { name: 'remediation', label: 'Remediation items (≥1 per skill_tag — derived from all questions)', run: () => seedRemediationItems(prisma) },
  { name: 'stimuli', label: 'Stimuli — Unit 1 reading-load variants + accommodations', run: () => seedStimuliUnit1(prisma) },
  { name: 'stimuli-visual', label: 'Visual stimuli (Canva TIMELINE/CHART/FLOWCHART pilot — ADR 0018)', run: () => seedVisualStimuli(prisma) },
  { name: 'badges', label: 'Badges', run: () => seedBadges(prisma) },
  { name: 'assessments', label: 'Mission assessments (pre-check, readiness, vocab, mastery, region reviews)', run: () => seedMissionAssessments(prisma) },
]

async function main() {
  const onlyArg = process.argv.find((a) => a.startsWith('--only='))
  const requested = onlyArg
    ? onlyArg
        .slice('--only='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : null

  if (requested) {
    const known = new Set(STAGES.map((s) => s.name))
    const unknown = requested.filter((n) => !known.has(n))
    if (unknown.length > 0) {
      console.error(`Unknown seed stage(s): ${unknown.join(', ')}`)
      console.error(`Available: ${STAGES.map((s) => s.name).join(', ')}`)
      process.exit(1)
    }
  }

  const toRun = requested ? STAGES.filter((s) => requested.includes(s.name)) : STAGES

  console.log(
    requested
      ? `🌱 Starting seed (${toRun.length} of ${STAGES.length} stages: ${requested.join(', ')})...\n`
      : '🌱 Starting seed...\n'
  )

  for (const [i, stage] of toRun.entries()) {
    console.log(`${i + 1}/${toRun.length} ${stage.label}`)
    await stage.run()
  }

  console.log('\n✅ Seed complete.')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
