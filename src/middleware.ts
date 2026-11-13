/**
 * Next.js 14 Middleware — Role-Based Route Protection
 *
 * Uses next-auth's withAuth helper to:
 *   1. Require authentication for all protected route prefixes
 *   2. Enforce role-based access using checkRouteAccess (pure function)
 *
 * Protected prefixes:
 *   /teacher/* — TEACHER only (ADMIN also allowed)
 *   /admin/*   — ADMIN only
 *
 * /student/* is PUBLIC and is deliberately NOT in the matcher below: students
 * have no accounts, so this middleware never runs for a student request and
 * never reads (or sets) a cookie for one.
 *
 * CRITICAL: `secret` must be passed explicitly here.
 * withAuth defaults to NEXTAUTH_SECRET env var; our app uses SESSION_SECRET.
 * Without this, withAuth cannot decode the JWT and redirects all authenticated
 * users back to /login in an infinite loop.
 *
 * This file runs in the Edge Runtime — no Node.js/Prisma imports allowed.
 * `checkRouteAccess` is a pure function with no external imports.
 */

import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequestWithAuth } from 'next-auth/middleware'
import { checkRouteAccess } from '@/lib/auth/route-guard'

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    const role = token?.role as string | undefined
    const result = checkRouteAccess(pathname, role)

    if (result === 'redirect-login') {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    if (result === 'redirect-unauthorized') {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    // Sub-mode write gate: block mutating API calls when substitute mode is on.
    // Exception: the toggle endpoint itself must always work.
    // Edge-safe: reads cookie via req.cookies — no Prisma/Node imports.
    const isMutation = ['POST', 'PATCH', 'DELETE'].includes(req.method)
    const isGuardedApi =
      /^\/api\/(teacher|admin)\//.test(pathname)
    const isToggleRoute = pathname === '/api/teacher/sub-mode/toggle'
    const subMode = req.cookies.get('cq_sub_mode')?.value === '1'
    if (isMutation && isGuardedApi && !isToggleRoute && subMode) {
      return new NextResponse(
        JSON.stringify({ error: 'SUB_MODE_READ_ONLY' }),
        { status: 403, headers: { 'content-type': 'application/json' } }
      )
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
    '/teacher/:path*',
    '/admin/:path*',
  ],
}
