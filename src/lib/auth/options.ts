/**
 * next-auth v4 configuration for My Civics Class.
 *
 * There is exactly ONE provider: Google, for the teacher/admin who authors
 * lessons. Students have no accounts and never sign in, so there is no student
 * provider, no district SSO, and no demo login of any kind.
 *
 * Who may sign in: only addresses on `TEACHER_ALLOWED_EMAILS` (see
 * ./allowlist). The list is mandatory and fails closed — unset means nobody.
 * The check runs before any database write, so a rejected sign-in creates no
 * `User` row.
 *
 * Session strategy: JWT (no DB adapter; role + userId in the encrypted cookie).
 * Secret: process.env.SESSION_SECRET.
 */

import GoogleProvider from 'next-auth/providers/google'
import type { NextAuthOptions, User, Account } from 'next-auth'
import { prisma } from '@/lib/db'
import { isTeacherEmailAllowed } from './allowlist'

export type SignInDecision =
  | { ok: true; userId: string; role: 'TEACHER' | 'ADMIN' }
  | { ok: false; redirect: string }

/**
 * Decide a Google sign-in. Exported so it is testable without next-auth.
 *
 *   - Not Google, no email, or not on the allowlist → rejected, nothing written.
 *   - On the allowlist, no row yet → a TEACHER row is created ACTIVE (being on
 *     the list IS the approval; there is no pending queue).
 *   - Existing row → role preserved; anything but ACTIVE is rejected.
 */
export async function resolveTeacherSignIn(
  user: Pick<User, 'id' | 'email' | 'name'>,
  account: Pick<Account, 'provider'> | null,
  env: Record<string, string | undefined> = process.env
): Promise<SignInDecision> {
  if (account?.provider !== 'google' || !user.email) {
    return { ok: false, redirect: '/login?error=not-allowed' }
  }
  if (!isTeacherEmailAllowed(user.email, env)) {
    return { ok: false, redirect: '/login?error=not-allowed' }
  }

  const email = user.email.trim().toLowerCase()
  const nameParts = (user.name ?? 'Teacher').split(' ')
  const firstName = nameParts[0] || 'Teacher'
  const lastName = nameParts.slice(1).join(' ') || ''

  const dbUser = await prisma.user.upsert({
    where: { email },
    update: { googleId: user.id },
    create: {
      googleId: user.id,
      firstName,
      lastName,
      role: 'TEACHER',
      email,
      status: 'ACTIVE',
    },
    select: { id: true, role: true, status: true },
  })

  if (dbUser.status !== 'ACTIVE') {
    return { ok: false, redirect: '/login?error=not-allowed' }
  }
  if (dbUser.role !== 'TEACHER' && dbUser.role !== 'ADMIN') {
    return { ok: false, redirect: '/login?error=not-allowed' }
  }

  // Lesson authoring is class-scoped, so a teacher needs a Teacher row and at
  // least one class to arrange lessons for. A class is only a label for a
  // lesson arrangement — it has no roster and nobody is ever enrolled in it.
  if (dbUser.role === 'TEACHER') {
    const teacher = await prisma.teacher.upsert({
      where: { userId: dbUser.id },
      update: {},
      create: { userId: dbUser.id },
      select: { id: true },
    })
    const classCount = await prisma.class.count({ where: { teacherId: teacher.id } })
    if (classCount === 0) {
      const now = new Date()
      const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
      await prisma.class.create({
        data: {
          teacherId: teacher.id,
          name: 'Civics',
          schoolYear: `${startYear}-${startYear + 1}`,
        },
      })
    }
  }

  return { ok: true, userId: dbUser.id, role: dbUser.role }
}

export const authOptions: NextAuthOptions = {
  // Use SESSION_SECRET per spec — not NEXTAUTH_SECRET
  secret: process.env.SESSION_SECRET,

  session: {
    strategy: 'jwt',
    // Eight hours — one school day. A JWT session has no server-side
    // revocation, so a short lifetime is the available mitigation.
    maxAge: 8 * 60 * 60,
  },

  pages: {
    signIn: '/login',
    error: '/login', // next-auth appends ?error=... to this URL
  },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      try {
        const decision = await resolveTeacherSignIn(user, account)
        if (!decision.ok) return decision.redirect
        ;(user as User).userId = decision.userId
        ;(user as User).role = decision.role
        return true
      } catch (err) {
        // Log message only — never log tokens or credentials
        console.error('[auth] signIn error:', err instanceof Error ? err.message : String(err))
        return false
      }
    },

    async jwt({ token, user }) {
      // `user` is only present on the first sign-in, not on subsequent JWT refreshes
      if (user) {
        token.userId = (user as User).userId
        token.role = (user as User).role
      }
      return token
    },

    async session({ session, token }) {
      if (!session.user) {
        // @ts-expect-error — session.user may be undefined in edge cases; initialize it
        session.user = {}
      }
      session.user.userId = token.userId
      session.user.role = token.role
      return session
    },
  },
}
