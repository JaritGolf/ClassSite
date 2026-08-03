/**
 * Where each role lands after signing in.
 *
 * Shared between the login page (Server Component, for redirecting an
 * already-authenticated visitor) and LoginButtons (Client Component, which
 * uses it as the post-sign-in callbackUrl for the demo role buttons). Pure
 * data — safe to import from either side.
 */

import type { UserRole } from '@prisma/client'

export const ROLE_HOME: Record<UserRole, string> = {
  STUDENT: '/student/dashboard',
  TEACHER: '/teacher/dashboard',
  PARENT:  '/parent/dashboard',
  ADMIN:   '/admin/users',
}
