/**
 * next-auth v4 configuration for Civics Quest.
 *
 * Providers (in priority order):
 *   1. mock-credentials — dev only (MOCK_AUTH=true, NODE_ENV !== production)
 *   2. clever           — primary SSO (Clever district OAuth)
 *   3. google           — fallback (staff/teacher Google Workspace accounts)
 *
 * Session strategy: JWT (no DB adapter; role + userId stored in encrypted cookie).
 * Secret: process.env.SESSION_SECRET (spec variable name).
 *
 * Google role policy: new Google users are created with status INACTIVE
 * pending admin approval. They cannot sign in until an admin activates them
 * in /admin/users. This is intentional — Google OAuth is for staff only;
 * students use Clever exclusively.
 */

import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import type { NextAuthOptions, User, Account } from 'next-auth'
import type { UserRole } from '@prisma/client'
import { UserRole as UserRoleEnum } from '@prisma/client'
import { prisma } from '@/lib/db'
import { cleverProvider } from './providers/clever'
import { recordParentLoginEvent } from '@/lib/parent-portal/login'
import { recordStudentLoginEvent } from '@/lib/activity-sessions/login'

// ── Mock Auth (dev only) ──────────────────────────────────────────────────────

interface MockUser {
  cleverId: string
  firstName: string
  lastName: string
}

const MOCK_USERS: Record<UserRole, MockUser> = {
  STUDENT: { cleverId: 'mock-student-001', firstName: 'Alex', lastName: 'Student' },
  TEACHER: { cleverId: 'mock-teacher-001', firstName: 'Ms', lastName: 'Teacher' },
  PARENT:  { cleverId: 'mock-parent-001',  firstName: 'Pat', lastName: 'Parent' },
  ADMIN:   { cleverId: 'mock-admin-001',   firstName: 'Admin', lastName: 'User' },
}

/**
 * Exported so it can be unit-tested independently of next-auth.
 * Called by the CredentialsProvider.authorize callback.
 */
export async function mockAuthorize(
  credentials: Record<string, string> | undefined
): Promise<User | null> {
  // Double guard: runtime check AND build-time conditional provider inclusion
  if (
    process.env.MOCK_AUTH !== 'true' ||
    process.env.NODE_ENV === 'production'
  ) {
    return null
  }

  const role = credentials?.role as UserRole | undefined
  if (!role || !Object.values(UserRoleEnum).includes(role)) {
    return null
  }

  const mock = MOCK_USERS[role]
  const dbUser = await prisma.user.upsert({
    where: { cleverId: mock.cleverId },
    update: {},
    create: {
      cleverId: mock.cleverId,
      firstName: mock.firstName,
      lastName: mock.lastName,
      role,
      status: 'ACTIVE',
    },
  })

  return {
    id: dbUser.cleverId!,
    userId: dbUser.id,
    name: `${dbUser.firstName} ${dbUser.lastName}`,
    email: dbUser.email ?? null,
    role: dbUser.role,
    image: null,
  }
}

// ── DB Upsert Helper ──────────────────────────────────────────────────────────

/**
 * Upserts a User record to the DB on sign-in.
 * Returns the DB User.id (cuid) which is then stored in the JWT as userId.
 */
async function upsertUserFromSignIn(
  user: User,
  account: Account | null
): Promise<string> {
  if (account?.provider === 'clever') {
    if (!user.role) {
      throw new Error(`Unknown Clever user type — cannot determine role for clever_id=${user.id}`)
    }
    const dbUser = await prisma.user.upsert({
      where: { cleverId: user.id },
      update: { status: 'ACTIVE' },
      create: {
        cleverId: user.id,
        firstName: 'Clever', // TODO (Phase 17): fetch real name from Clever API
        lastName: 'User',    // TODO (Phase 17): fetch real name from Clever API
        role: user.role,
        status: 'ACTIVE',
      },
    })
    return dbUser.id
  }

  if (account?.provider === 'google') {
    if (!user.email) {
      throw new Error('Google sign-in requires an email address')
    }
    // Split display name into first/last (best effort)
    const nameParts = (user.name ?? 'Google User').split(' ')
    const firstName = nameParts[0] ?? 'Google'
    const lastName = nameParts.slice(1).join(' ') || 'User'

    // New Google users: status INACTIVE (pending admin approval).
    // Existing users: preserve their current status.
    const dbUser = await prisma.user.upsert({
      where: { email: user.email },
      update: { googleId: user.id },
      create: {
        googleId: user.id,
        firstName,
        lastName,
        role: 'TEACHER', // Google fallback defaults to TEACHER (district staff)
        email: user.email,
        status: 'INACTIVE', // Must be activated by admin before first login
      },
    })
    return dbUser.id
  }

  // Credentials (mock-credentials): mockAuthorize already upserted the user
  // and returned the userId. No further DB work needed.
  return user.userId
}

// ── Auth Options ──────────────────────────────────────────────────────────────

export const authOptions: NextAuthOptions = {
  // Use SESSION_SECRET per spec — not NEXTAUTH_SECRET
  secret: process.env.SESSION_SECRET,

  session: { strategy: 'jwt' },

  pages: {
    signIn: '/login',
    error: '/login', // next-auth appends ?error=... to this URL
  },

  providers: [
    // 1. Mock credentials — dev only; excluded from production build entirely
    ...(process.env.MOCK_AUTH === 'true' && process.env.NODE_ENV !== 'production'
      ? [
          CredentialsProvider({
            id: 'mock-credentials',
            name: 'Mock (Dev Only)',
            credentials: {
              role: { label: 'Role', type: 'text' },
            },
            authorize: mockAuthorize,
          }),
        ]
      : []),

    // 2. Clever — primary SSO
    cleverProvider(),

    // 3. Google — fallback for staff
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      try {
        const dbId = await upsertUserFromSignIn(user as User, account)
        ;(user as User).userId = dbId

        // Google users with INACTIVE status: redirect to pending-approval error
        if (account?.provider === 'google') {
          const dbUser = await prisma.user.findUnique({
            where: { id: dbId },
            select: { status: true },
          })
          if (dbUser?.status === 'INACTIVE') {
            return '/login?error=pending-approval'
          }
        }

        return true
      } catch (err) {
        // Log message only — never log tokens or credentials
        console.error(
          '[auth] signIn error:',
          err instanceof Error ? err.message : String(err)
        )
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
      // Populate session.user from the JWT (token is always present in JWT strategy)
      if (!session.user) {
        // @ts-expect-error — session.user may be undefined in edge cases; initialize it
        session.user = {}
      }
      session.user.userId = token.userId
      session.user.role = token.role
      return session
    },
  },

  events: {
    async signIn({ user }) {
      const userId = (user as User).userId

      // Audit parent login events (audit §36.19 item 4). Non-fatal.
      try {
        await recordParentLoginEvent(userId)
      } catch (err) {
        console.error(
          '[auth] PARENT_LOGIN audit error:',
          err instanceof Error ? err.message : String(err)
        )
      }

      // Audit student logins and open their activity session. Non-fatal, and
      // deliberately in its own try/catch so neither audit can suppress the
      // other — a sign-in must never fail because of activity bookkeeping.
      try {
        await recordStudentLoginEvent(userId)
      } catch (err) {
        console.error(
          '[auth] STUDENT_LOGIN audit error:',
          err instanceof Error ? err.message : String(err)
        )
      }
    },
  },
}
