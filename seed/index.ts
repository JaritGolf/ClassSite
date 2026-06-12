/**
 * Civics Quest — Master Seed Entry Point
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
import { seedSampleQuestions } from './sample_questions_unit_1'
import { seedUnit1Backfill } from './questions/unit1_backfill'
import { seedUnit2Questions } from './questions/unit2'
import { seedRemediationItems } from './remediation_items'
import { seedStimuliUnit1 } from './stimuli_unit1'
import { seedBadges } from './badges'
import { seedUnit1Assessments } from './assessments_unit1'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...\n')

  console.log('1/7 Reporting categories')
  await seedReportingCategories(prisma)

  console.log('2/7 Benchmarks, units, accommodations')
  await seedBenchmarks(prisma)

  console.log('3/7 Misconception inventory')
  await seedMisconceptions(prisma)

  console.log('4/7 Vocabulary')
  await seedVocabulary(prisma)

  console.log('5/11 Sample questions (Unit 1, original 15/benchmark)')
  await seedSampleQuestions(prisma)

  console.log('6/11 Unit 1 backfill (→ 30/benchmark, Tier C / NEEDS_REVIEW)')
  await seedUnit1Backfill(prisma)

  console.log('7/11 Unit 2 question bank (Phase 15, Tier C / NEEDS_REVIEW)')
  await seedUnit2Questions(prisma)

  console.log('8/11 Remediation items (≥1 per skill_tag — derived from all questions)')
  await seedRemediationItems(prisma)

  console.log('9/11 Stimuli — Unit 1 reading-load variants + accommodations')
  await seedStimuliUnit1(prisma)

  console.log('10/11 Badges')
  await seedBadges(prisma)

  console.log('11/11 Unit 1 assessments (pre-check, readiness, vocab, region review)')
  await seedUnit1Assessments(prisma)

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
