/**
 * next-auth v4 type augmentation for My Civics Class.
 *
 * Adds `userId` (DB cuid) and `role` (Prisma UserRole enum) to:
 *   - Session.user   — accessible in Server Components via getServerSession()
 *   - User           — the object returned by authorize() / profile()
 *   - JWT            — the encrypted cookie payload
 *
 * Note: `extends` is not valid in declaration merging; base fields are restated inline.
 */

import type { UserRole } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      userId: string
      role: UserRole
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }

  interface User {
    userId: string
    role: UserRole
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string
    role: UserRole
  }
}
