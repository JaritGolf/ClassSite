/**
 * My Civics Class — Demo Data Seed (dev/test only)
 *
 * Populates a realistic classroom tied to the existing mock-auth identities
 * (mock-student-001 / mock-teacher-001 / mock-parent-001) so the STUDENT /
 * TEACHER / PARENT one-click buttons on /login land on fully populated
 * dashboards instead of empty ones.
 *
 * Assumes `npm run db:seed` has already loaded reference content
 * (benchmarks, questions, assessments, remediation catalog, badges).
 *
 * Drives real attempts through the actual assessment/mastery/remediation/
 * streak/spaced-retrieval engines wherever those engines exist, so this data
 * is exactly as internally consistent as production data. A few leaf tables
 * with no engine of their own (People/Class rows, StudentBadge awards,
 * StudentAccommodation grants) are hand-written — flagged inline at each
 * file's relevant block.
 *
 * Idempotent: safe to run multiple times. Never run in production.
 *
 * Run: npm run db:seed:demo
 */

import { recordClassReadinessSnapshot } from '@/lib/eoc-analytics'
import { seedDemoPeople } from './people'
import { seedHeroProgress } from './hero-progress'
import { seedClassmatesProgress } from './classmates-progress'
import { seedExtras } from './extras'

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('seed/demo is dev/test-only — refusing to run with NODE_ENV=production')
  }

  console.log('🌱 Seeding demo data...\n')

  console.log('1/5 People: teacher, class, hero student + 5 classmates, verified parent link')
  const people = await seedDemoPeople()

  console.log('2/5 Hero student progress (Unit 1)')
  const heroSummary = await seedHeroProgress(people.heroStudentId, people.teacherUserId)
  console.log(`   ${heroSummary}`)

  console.log('3/5 Classmates progress (Unit 1)')
  const classmateSummaries = await seedClassmatesProgress(people.classmateStudentIds, people.teacherUserId)
  for (const s of classmateSummaries) console.log(`   ${s}`)

  console.log('4/5 Class-level EOC readiness snapshot')
  await recordClassReadinessSnapshot(people.classId)

  console.log('5/5 Extras: streak, spaced review, badges, accommodations')
  await seedExtras({ heroStudentId: people.heroStudentId, teacherUserId: people.teacherUserId })

  console.log(`
✅ Demo data seeded.

Log in at http://localhost:3000/login (requires MOCK_AUTH="true" in .env.local):
  STUDENT  → Alex Student   (mock-student-001)  — Unit 1: 2 mastered, 1 in remediation, rest locked
  TEACHER  → Ms Teacher     (mock-teacher-001)   — Period 3 — Civics, 6 students
  PARENT   → Pat Parent     (mock-parent-001)    — verified link to Alex Student
             (requires FEATURE_PARENT_PORTAL="true" in .env.local for /parent/* to render)
  ADMIN    → Admin User     (mock-admin-001)
`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Demo seed failed:', err)
    process.exit(1)
  })
