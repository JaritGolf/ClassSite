/**
 * Auth utilities for My Civics Class — Server Components and API Routes.
 *
 * Usage in a Server Component:
 *   import { requireAuth } from '@/lib/auth'
 *   const session = await requireAuth(['TEACHER'])
 *   // session.user.role is guaranteed 'TEACHER' here
 *
 * Usage when role doesn't matter (just need to be logged in):
 *   const session = await requireAuth()
 */

import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from './options'
import type { UserRole } from '@prisma/client'
import type { Session } from 'next-auth'

/** Narrowed session type with non-optional user fields */
export type AppSession = Omit<Session, 'user'> & {
  user: {
    userId: string
    role: UserRole
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

/**
 * Read the current session from the JWT cookie.
 * Returns null when unauthenticated.
 */
export async function getSession(): Promise<AppSession | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.userId) return null
  return session as AppSession
}

/**
 * Assert the user is authenticated and optionally in one of the allowed roles.
 * Redirects to /login if unauthenticated, /unauthorized if wrong role.
 * Never returns null — throws a Next.js redirect on failure.
 */
export async function requireAuth(allowedRoles?: UserRole[]): Promise<AppSession> {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(session.user.role)) {
    redirect('/unauthorized')
  }

  return session
}

// Re-export authOptions for the [...nextauth] route handler
export { authOptions }
