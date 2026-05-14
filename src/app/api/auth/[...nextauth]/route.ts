/**
 * next-auth v4 catch-all route handler for Next.js 14 App Router.
 *
 * All auth configuration lives in src/lib/auth/options.ts.
 * This file is intentionally thin.
 */

import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth/options'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
