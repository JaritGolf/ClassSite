/**
 * Backfill CLI for the dashboard's "pick up where you left off" card.
 *
 *   npm run backfill:last-activity                      # preview, writes nothing
 *   npm run backfill:last-activity -- --apply           # write
 *   npm run backfill:last-activity -- --apply --force   # also overwrite existing rows
 *
 * Why this exists
 * ---------------
 * `StudentLastActivity` is populated only by the seven `recordLastActivity`
 * hooks, and every one of them lives in an API route handler. Its migration
 * (20260724120000_add_student_last_activity) is pure DDL with no backfill, and
 * the demo seeder drives students through the ENGINE layer
 * (seed/demo/engine-helpers.ts → gradeAndSubmit) rather than over HTTP, so the
 * hooks never fire for seeded data.
 *
 * Net effect on a freshly-migrated database: every student has mastery,
 * attempts and remediations but zero activity rows — so
 * `getLastActivityForStudent` returns null and the card silently never renders
 * until that student's next live action. This closes that gap.
 *
 * The derive logic is shared with the demo seeder via
 * src/lib/student-activity/derive.ts so the two cannot drift.
 *
 * Idempotent: skips students who already have a row unless --force.
 */

import { PrismaClient } from '@prisma/client'
import { recordLastActivity } from '../src/lib/student-activity/record'
import { deriveActivityCandidates } from '../src/lib/student-activity/derive'

const prisma = new PrismaClient()

async function main() {
  const apply = process.argv.includes('--apply')
  const force = process.argv.includes('--force')

  const students = await prisma.student.findMany({
    select: {
      id: true,
      user: { select: { firstName: true, lastName: true } },
      lastActivity: { select: { activityType: true, occurredAt: true } },
    },
    orderBy: { id: 'asc' },
  })

  console.log(
    `${students.length} student(s) found.` +
      (apply ? '' : '  [dry-run — nothing will be written]')
  )
  console.log(force ? '--force: existing rows WILL be overwritten.\n' : '')

  let wrote = 0
  let skippedExisting = 0
  let skippedNoHistory = 0

  for (const s of students) {
    const name = `${s.user.firstName} ${s.user.lastName}`

    if (s.lastActivity && !force) {
      console.log(
        `  = ${name}: already has ${s.lastActivity.activityType}` +
          ` (${s.lastActivity.occurredAt.toISOString()}) — skipping`
      )
      skippedExisting++
      continue
    }

    const candidates = await deriveActivityCandidates(s.id)
    if (candidates.length === 0) {
      console.log(`  - ${name}: no activity history — skipping`)
      skippedNoHistory++
      continue
    }

    const [best, ...rest] = candidates
    console.log(`  ${apply ? '+' : '?'} ${name}: ${best.describe} @ ${best.occurredAt.toISOString()}`)
    if (rest.length > 0) {
      const others = rest
        .map((c) => `${c.activityType}@${c.occurredAt.toISOString()}`)
        .join(', ')
      console.log(`      (beat: ${others})`)
    }

    if (apply) {
      await recordLastActivity(s.id, best.activityType, best.referenceId, best.occurredAt)
      wrote++
    }
  }

  const wouldWrite = students.length - skippedExisting - skippedNoHistory
  console.log(
    `\n${apply ? `[applied] wrote ${wrote} row(s)` : `[dry-run] would write ${wouldWrite} row(s)`}` +
      `; ${skippedExisting} already had one, ${skippedNoHistory} had no history.`
  )
  if (!apply) console.log('Re-run with --apply to write.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
