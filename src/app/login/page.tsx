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
import { Mascot } from '@/components/ui/Mascot'
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-indigo-50 bg-dots bg-[length:26px_26px] px-4 py-10">
      <div className="w-full max-w-sm animate-pop-in rounded-3xl border-2 border-indigo-100 bg-white p-8 shadow-card">
        <div className="text-center">
          <Mascot pose="happy" className="mx-auto h-24 w-24" title="The Founder, the My Civics Class eagle mascot" />
          <h1 className="mt-3 font-display text-3xl font-bold text-indigo-900">
            My Civics Class
          </h1>
          <p className="font-display text-base font-semibold text-indigo-600">Build the Republic</p>
          <p className="mt-3 text-sm text-gray-600">
            Sign in to continue to your mission.
          </p>
        </div>

        <div className="mt-6">
          <LoginButtons
            callbackUrl={callbackUrl}
            showMockPanel={showMockPanel}
            error={searchParams.error ?? null}
          />
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-gray-600">
        Students: sign in via Clever using your school account.
        <br />
        Staff: use Google or Clever.
      </p>
    </main>
  )
}
