/**
 * Route Guard — pure role-check logic, no Edge/Node dependencies.
 *
 * Used by src/middleware.ts (Edge Runtime) and tested directly in unit tests.
 * Keeping this as a pure function avoids Edge Runtime incompatibilities.
 *
 * Access policy:
 *   STUDENT  → /student/* only
 *   TEACHER  → /teacher/* only
 *   PARENT   → /parent/* only
 *   ADMIN    → all protected routes (super-access for support)
 */

import type { UserRole } from '@prisma/client'

/** Route prefix → roles that may access it */
export const ROLE_ROUTES: Record<string, UserRole[]> = {
  '/student': ['STUDENT'],
  '/teacher': ['TEACHER'],
  '/parent': ['PARENT'],
  '/admin': ['ADMIN'],
}

export type RouteCheckResult = 'allow' | 'redirect-login' | 'redirect-unauthorized'

/**
 * Determine whether a request should be allowed, redirected to login,
 * or redirected to the unauthorized page.
 *
 * @param pathname  - The request pathname (e.g. '/student/dashboard')
 * @param role      - The user's role from the JWT, or null/undefined if unauthenticated
 */
export function checkRouteAccess(
  pathname: string,
  role: UserRole | null | undefined
): RouteCheckResult {
  const isProtected = Object.keys(ROLE_ROUTES).some((prefix) =>
    pathname.startsWith(prefix)
  )

  // Unauthenticated
  if (!role) {
    return isProtected ? 'redirect-login' : 'allow'
  }

  // ADMIN has super-access to all routes (confirmed decision)
  if (role === 'ADMIN') return 'allow'

  const matchedPrefix = Object.keys(ROLE_ROUTES).find((prefix) =>
    pathname.startsWith(prefix)
  )

  // No matched protected prefix — allow
  if (!matchedPrefix) return 'allow'

  // Check whether the user's role is in the allowed list for this prefix
  return ROLE_ROUTES[matchedPrefix].includes(role)
    ? 'allow'
    : 'redirect-unauthorized'
}
