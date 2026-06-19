/**
 * Data-retention purge CLI (Phase 17, audit §36.18 item 8).
 *
 *   npm run retention:purge -- --dry-run   # preview counts (default)
 *   npm run retention:purge -- --apply     # actually delete
 *
 * Thresholds come from AUDIT_LOG_RETENTION_DAYS / VOIDED_ATTEMPT_RETENTION_DAYS
 * (see docs/data-retention.md). With no thresholds set, nothing is eligible.
 */

import { purgeExpiredData } from '@/lib/retention'

async function main() {
  const apply = process.argv.includes('--apply')
  const dryRun = !apply

  const result = await purgeExpiredData({ dryRun, actorUserId: null })

  console.log(dryRun ? '[dry-run] eligible for deletion:' : '[applied] deleted:')
  console.log(`  audit logs:        ${result.auditLogsDeleted}`)
  console.log(`  voided attempts:   ${result.voidedAttemptsDeleted}`)
  console.log(`  attempt responses: ${result.attemptResponsesDeleted}`)
  console.log('  policy:', result.config)
  if (dryRun) console.log('\nRe-run with --apply to delete.')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
