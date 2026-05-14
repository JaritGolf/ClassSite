/**
 * Next.js 14 Middleware — Role-Based Route Protection
 *
 * Uses next-auth's withAuth helper to:
 *   1. Require authentication for all protected route prefixes
 *   2. Enforce role-based access using checkRouteAccess (pure function)
 *
 * Protected prefixes:
 *   /student/* — STUDENT only (ADMIN also allowed via super-access)
 *   /teacher/* — TEACHER only (ADMIN also allowed)
 *   /parent/*  — PARENT only  (ADMIN also allowed)
 *   /admin/*   — ADMIN only
 *
 * CRITICAL: `secret` must be passed explicitly here.
 * withAuth defaults to NEXTAUTH_SECRET env var; our app uses SESSION_SECRET.
 * Without this, withAuth cannot decode the JWT and redirects all authenticated
 * users back to /login in an infinite loop.
 *
 * This file runs in the Edge Runtime — no Node.js/Prisma imports allowed.
 * `checkRouteAccess` is a pure function with no external imports.
 * `UserRole` is a type-only import (stripped at runtime).
 */

import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequestWithAuth } from 'next-auth/middleware'
import type { UserRole } from '@prisma/client'
import { checkRouteAccess } from '@/lib/auth/route-guard'

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    const role = token?.role as UserRole | undefined
    const result = checkRouteAccess(pathname, role)

    if (result === 'redirect-login') {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    if (result === 'redirect-unauthorized') {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    return NextResponse.next()
  },
  {
    // Must match SESSION_SECRET — see critical note above
    secret: process.env.SESSION_SECRET,
    pages: { signIn: '/login' },
    callbacks: {
      // Let unauthenticated requests through to the middleware fn above
      // so redirect-login logic runs (withAuth would redirect to signIn by default,
      // but we handle it explicitly for clarity)
      authorized() {
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    '/student/:path*',
    '/teacher/:path*',
    '/parent/:path*',
    '/admin/:path*',
  ],
}
