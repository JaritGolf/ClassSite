/**
 * Admin Users page — shell page.
 * Full admin UI implemented in Phase 9/17.
 *
 * Note: ADMIN role has super-access to all routes (student/teacher/parent/admin).
 * This is the ADMIN home page for user management.
 */

import { requireAuth } from '@/lib/auth'

export default async function AdminUsersPage() {
  const session = await requireAuth(['ADMIN'])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">
          Admin — User Management
        </h1>
        <p className="text-gray-600">
          User roster, role assignment, and Google account activation coming in Phase 9.
        </p>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
          <p className="font-mono">Role: {session.user.role}</p>
          <p className="font-mono">User ID: {session.user.userId}</p>
        </div>
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="text-sm text-gray-500 underline hover:text-gray-700"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  )
}
