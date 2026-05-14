/**
 * Unauthorized page — shown when a user tries to access a route
 * outside their role (e.g., STUDENT visiting /teacher/dashboard).
 *
 * No auth check here — this page is intentionally public.
 */

import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Access Denied</h1>
        <p className="text-gray-600">
          You do not have permission to view this page.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          Return to sign in
        </Link>
      </div>
    </main>
  )
}
