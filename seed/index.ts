/**
 * Civics Quest — Master Seed Entry Point
 *
 * Phase 0: stubs only.
 * Phase 1 will implement each module with idempotent seed data.
 *
 * Run: npm run db:seed
 */

// import { seedBenchmarks } from './benchmarks'
// import { seedReportingCategories } from './reporting_categories'
// import { seedMisconceptions } from './misconception_inventory'
// import { seedVocabulary } from './vocabulary'
// import { seedSampleQuestions } from './sample_questions_unit_1'

async function main() {
  console.log('Seed scripts are stubbed — implement in Phase 1.')
  // await seedReportingCategories()
  // await seedBenchmarks()
  // await seedMisconceptions()
  // await seedVocabulary()
  // await seedSampleQuestions()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
