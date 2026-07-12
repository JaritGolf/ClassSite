/**
 * e2e global teardown — deliberately a no-op.
 *
 * The mock-* users are SHARED with the demo classroom seed
 * (`npm run db:seed:demo`): mock-student-001 is the demo hero student, so the
 * historic aggressive cleanup here (delete every mock-* user + children)
 * destroyed the demo dataset whenever the e2e suite ran (observed 2026-07-11).
 *
 * It is also no longer needed: tests/integration/auth.test.ts tolerates an
 * FK-blocked mock-user wipe, so e2e leftovers can't fail the jest suite in
 * either run order. Restore demo data anytime with `npm run db:seed:demo`
 * (idempotent).
 */
export default async function globalTeardown() {
  // no-op
}
