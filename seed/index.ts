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
import { seedStimuliUnit1 } from './stimuli_unit1'
import { seedBadges } from './badges'

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

  console.log('5/7 Sample questions (Unit 1)')
  await seedSampleQuestions(prisma)

  console.log('6/7 Stimuli — Unit 1 reading-load variants + accommodations')
  await seedStimuliUnit1(prisma)

  console.log('7/7 Badges')
  await seedBadges(prisma)

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
