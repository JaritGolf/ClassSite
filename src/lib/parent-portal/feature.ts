/**
 * FEATURE_PARENT_PORTAL flag (Phase 18, spec §29 feature flags).
 *
 * Opt-in (off by default, matching .env.example): set FEATURE_PARENT_PORTAL="true"
 * to enable real parent login + the linked-student dashboard. Kept off until the
 * district parent-identity-verification policy is confirmed (spec §37,
 * docs/parent-identity-policy.md). Lets parent login be enabled for a pilot — or
 * disabled instantly — without a code change.
 */
export function isParentPortalEnabled(): boolean {
  return process.env.FEATURE_PARENT_PORTAL === 'true'
}
