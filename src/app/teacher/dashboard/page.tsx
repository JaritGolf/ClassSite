/**
 * Teacher Dashboard — shell page.
 * Full LMS UI implemented in Phase 9.
 */

import { requireAuth } from '@/lib/auth'

export default async function TeacherDashboard() {
  const session = await requireAuth(['TEACHER'])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">
          Teacher Dashboard
        </h1>
        <p className="text-gray-600">
          Class management and analytics coming in Phase 9.
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
