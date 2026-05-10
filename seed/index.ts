/**
 * Civics Quest — Master Seed Entry Point
 *
 * Dependency order:
 *   1. reporting_categories  (no deps)
 *   2. benchmarks            (depends on reporting_categories)
 *   3. misconceptions        (depends on reporting_categories)
 *   4. vocabulary            (depends on benchmarks)
 *   5. sample_questions      (depends on benchmarks, reporting_categories, misconceptions)
 *
 * Idempotent: safe to run multiple times. Run: npm run db:seed
 */

import { PrismaClient } from '@prisma/client'
import { seedReportingCategories } from './reporting_categories'
import { seedBenchmarks } from './benchmarks'
import { seedMisconceptions } from './misconception_inventory'
import { seedVocabulary } from './vocabulary'
import { seedSampleQuestions } from './sample_questions_unit_1'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...\n')

  console.log('1/5 Reporting categories')
  await seedReportingCategories(prisma)

  console.log('2/5 Benchmarks, units, accommodations')
  await seedBenchmarks(prisma)

  console.log('3/5 Misconception inventory')
  await seedMisconceptions(prisma)

  console.log('4/5 Vocabulary')
  await seedVocabulary(prisma)

  console.log('5/5 Sample questions (Unit 1)')
  await seedSampleQuestions(prisma)

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
