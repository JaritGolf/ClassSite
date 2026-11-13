/**
 * Route Guard — pure role-check logic, no Edge/Node dependencies.
 *
 * Used by src/middleware.ts (Edge Runtime) and tested directly in unit tests.
 *
 * Access policy:
 *   /student/*  → PUBLIC. Students have no accounts; nothing here reads a
 *                 session. It is deliberately absent from ROLE_ROUTES.
 *   /teacher/*  → TEACHER (ADMIN also allowed)
 *   /admin/*    → ADMIN
 */

/** The only roles that can hold a session. */
export type StaffRole = 'TEACHER' | 'ADMIN'

/** Route prefix → roles that may access it */
export const ROLE_ROUTES: Record<string, StaffRole[]> = {
  '/teacher': ['TEACHER'],
  '/admin': ['ADMIN'],
}

export type RouteCheckResult = 'allow' | 'redirect-login' | 'redirect-unauthorized'

function matchPrefix(pathname: string): string | undefined {
  return Object.keys(ROLE_ROUTES).find(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

/**
 * Determine whether a request should be allowed, redirected to login,
 * or redirected to the unauthorized page.
 *
 * @param pathname  - The request pathname (e.g. '/teacher/lessons')
 * @param role      - The role from the JWT, or null/undefined if unauthenticated
 */
export function checkRouteAccess(
  pathname: string,
  role: string | null | undefined
): RouteCheckResult {
  const matchedPrefix = matchPrefix(pathname)

  // Not a protected prefix (includes everything under /student) — allow.
  if (!matchedPrefix) return 'allow'

  if (!role) return 'redirect-login'

  // ADMIN has super-access to all protected routes
  if (role === 'ADMIN') return 'allow'

  return (ROLE_ROUTES[matchedPrefix] as string[]).includes(role)
    ? 'allow'
    : 'redirect-unauthorized'
}
