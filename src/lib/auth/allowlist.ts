/**
 * Teacher sign-in allowlist — mandatory, and it fails closed.
 *
 * Google sign-in exists for exactly one purpose: the teacher/admin who authors
 * lessons. Students never sign in (they have no accounts at all), so the only
 * people who may ever complete a sign-in are the addresses listed in
 * `TEACHER_ALLOWED_EMAILS`.
 *
 * Why an EMAIL list and not a DOMAIN list: a district domain such as
 * `palmbeachschools.org` is shared by every student in the district. A domain
 * allowlist would let a student's school Google account reach the sign-in
 * callback, and the app would then hold that student's name and email in a
 * `User` row — precisely the data this build exists not to hold.
 *
 * Rules:
 *   - Unset or empty  ⇒ nobody can sign in (fail closed).
 *   - Matching is exact, case-insensitive, on the whole address.
 *   - The check runs BEFORE any database write, so a rejected sign-in leaves
 *     nothing behind.
 */

/** Parse the comma-separated allowlist. Unset/empty ⇒ empty list ⇒ deny all. */
export function parseAllowedEmails(raw: string | undefined): string[] {
  if (raw == null) return []
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0 && e.includes('@'))
}

/** Is this exact address on the list? An empty list allows nobody. */
export function isEmailAllowed(
  email: string | null | undefined,
  allowedEmails: string[]
): boolean {
  if (allowedEmails.length === 0) return false
  if (!email) return false
  return allowedEmails.includes(email.trim().toLowerCase())
}

/** Convenience wrapper reading `TEACHER_ALLOWED_EMAILS`. */
export function isTeacherEmailAllowed(
  email: string | null | undefined,
  env: Record<string, string | undefined> = process.env
): boolean {
  return isEmailAllowed(email, parseAllowedEmails(env.TEACHER_ALLOWED_EMAILS))
}

/** True when the allowlist is configured at all (used for the login-page notice). */
export function isAllowlistConfigured(
  env: Record<string, string | undefined> = process.env
): boolean {
  return parseAllowedEmails(env.TEACHER_ALLOWED_EMAILS).length > 0
}
