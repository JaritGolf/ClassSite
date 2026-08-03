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

  console.log('4b/12 L1 term translations (Spanish all tier-3 + Haitian Creole sample)')
  await seedTermTranslations(prisma)

  console.log('5/12 Lessons (guided instruction per benchmark — ADR 0013)')
  await seedLessons(prisma)

  console.log('6/12 Sample questions (Unit 1, original 15/benchmark)')
  await seedSampleQuestions(prisma)

  console.log('7/12 Unit 1 backfill (→ 30/benchmark, APPROVED per ADR 0013)')
  await seedUnit1Backfill(prisma)

  console.log('7b/12 Unit 1 interim banks (official 1.1/1.2 — ADR 0017)')
  await seedUnit1Interim(prisma)

  console.log('8/12 Unit 2 question bank (Phase 15, Tier C / NEEDS_REVIEW)')
  await seedUnit2Questions(prisma)

  console.log('9/12 Remediation items (≥1 per skill_tag — derived from all questions)')
  await seedRemediationItems(prisma)

  console.log('10/12 Stimuli — Unit 1 reading-load variants + accommodations')
  await seedStimuliUnit1(prisma)

  console.log('10b/12 Visual stimuli (Canva TIMELINE/CHART/FLOWCHART pilot — ADR 0018)')
  await seedVisualStimuli(prisma)

  console.log('11/12 Badges')
  await seedBadges(prisma)

  console.log('12/12 Mission assessments (pre-check, readiness, vocab, mastery, region reviews)')
  await seedMissionAssessments(prisma)

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
