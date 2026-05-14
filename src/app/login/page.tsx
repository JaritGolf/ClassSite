/**
 * Login page — Server Component.
 *
 * - Already-authenticated users are redirected to their role's home page.
 * - `showMockPanel` is computed server-side (never exposed as NEXT_PUBLIC_*).
 * - Interactive buttons are delegated to LoginButtons (Client Component).
 */

import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { LoginButtons } from './LoginButtons'
import type { UserRole } from '@prisma/client'

const ROLE_HOME: Record<UserRole, string> = {
  STUDENT: '/student/dashboard',
  TEACHER: '/teacher/dashboard',
  PARENT:  '/parent/dashboard',
  ADMIN:   '/admin/users',
}

interface LoginPageProps {
  searchParams: { callbackUrl?: string; error?: string }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getSession()

  if (session) {
    redirect(ROLE_HOME[session.user.role])
  }

  const callbackUrl = searchParams.callbackUrl ?? '/'
  const showMockPanel =
    process.env.MOCK_AUTH === 'true' && process.env.NODE_ENV !== 'production'

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Civics Quest
          </h1>
          <p className="mt-2 text-sm text-gray-600">Build the Republic</p>
          <p className="mt-4 text-sm text-gray-500">
            Sign in to continue to your mission.
          </p>
        </div>

        <LoginButtons
          callbackUrl={callbackUrl}
          showMockPanel={showMockPanel}
          error={searchParams.error ?? null}
        />

        <p className="text-center text-xs text-gray-400">
          Students: sign in via Clever using your school account.
          <br />
          Staff: use Google or Clever.
        </p>
      </div>
    </main>
  )
}
