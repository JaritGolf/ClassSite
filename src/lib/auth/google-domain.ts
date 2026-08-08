/**
 * Google sign-in domain restriction (ADR 0003, implemented 2026-08-07)
 *
 * ADR 0003 recorded this as a Phase 17 hardening step "pending district
 * confirmation of the exact domain list" and it was never built. Until now, any
 * Google account on the internet could initiate sign-in. That was never an
 * *access* hole — a new Google user is created INACTIVE and cannot proceed
 * without an administrator — but it did mean an unbounded number of `User` rows
 * could be created by strangers, one per first sign-in attempt.
 *
 * Two things this fixes:
 *   1. Unknown domains are rejected BEFORE the upsert, so no row is created.
 *   2. It answers a predictable district review question ("can anyone sign in?")
 *      with a configuration value rather than a paragraph of reassurance.
 *
 * ── DELIBERATELY UNRESTRICTED BY DEFAULT ────────────────────────────────────
 * `GOOGLE_ALLOWED_DOMAINS` unset === allow any domain === the previous
 * behaviour. This is NOT an oversight, and it is not the recommended production
 * setting.
 *
 * The reason is lockout risk. The only administrator account on the production
 * deployment was bootstrapped by attaching a Google address to a seeded row
 * (`scripts/bootstrap-admin.ts --adopt`). Shipping a hard-coded
 * `palmbeachschools.org` default would lock that account out on the next deploy,
 * and the recovery path is direct database access. A security control that
 * removes the owner's own access is not a security control.
 *
 * So: set it deliberately, after confirming your own admin address matches.
 * `docs/deployment-vercel.md` carries this on the go-live checklist.
 *
 * Clever is intentionally NOT subject to this. Clever identities are issued by
 * the district; the district IS the allowlist.
 */

/** Parse a comma-separated domain allowlist. Empty/unset ⇒ no restriction. */
export function parseAllowedDomains(raw: string | undefined): string[] {
  if (raw == null) return []
  return raw
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d.length > 0)
}

/**
 * Is this email within the allowlist?
 *
 * An empty allowlist allows everything (see the note above). Matching is on the
 * exact domain after the last `@`, lower-cased — deliberately NOT a suffix match,
 * because a suffix match on "palmbeachschools.org" would also accept
 * "evilpalmbeachschools.org".
 *
 * Subdomains therefore need to be listed explicitly. That is the safe direction
 * to be wrong in.
 */
export function isEmailDomainAllowed(
  email: string | null | undefined,
  allowedDomains: string[]
): boolean {
  if (allowedDomains.length === 0) return true
  if (!email) return false

  const at = email.lastIndexOf('@')
  if (at === -1 || at === email.length - 1) return false

  const domain = email.slice(at + 1).trim().toLowerCase()
  return allowedDomains.includes(domain)
}

/** Convenience wrapper reading the env var. */
export function isGoogleEmailAllowed(
  email: string | null | undefined,
  env: Record<string, string | undefined> = process.env
): boolean {
  return isEmailDomainAllowed(email, parseAllowedDomains(env.GOOGLE_ALLOWED_DOMAINS))
}
