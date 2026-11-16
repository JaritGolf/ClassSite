/**
 * Teacher sign-in page — Server Component.
 *
 * Students do not sign in: the student area is open and keeps progress on the
 * device. This page exists only for the teacher/admin who authors lessons.
 */

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAllowlistConfigured } from '@/lib/auth/allowlist'
import { ROLE_HOME } from '@/lib/auth/role-home'
import { LoginButtons } from './LoginButtons'
import { Mascot } from '@/components/ui/Mascot'

interface LoginPageProps {
  searchParams: { callbackUrl?: string; error?: string }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getSession()

  if (session) {
    redirect(ROLE_HOME[session.user.role] ?? '/')
  }

  // Only same-site paths — never bounce a teacher to an arbitrary URL.
  const requested = searchParams.callbackUrl ?? ''
  const callbackUrl =
    requested.startsWith('/') && !requested.startsWith('//') ? requested : '/teacher/dashboard'

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-indigo-50 bg-dots bg-[length:26px_26px] px-4 py-10">
      <div className="w-full max-w-sm animate-pop-in rounded-3xl border-2 border-indigo-100 bg-white p-8 shadow-card">
        <div className="text-center">
          <Mascot pose="happy" className="mx-auto h-24 w-24" title="The Founder, the My Civics Class eagle mascot" />
          <h1 className="mt-3 font-display text-3xl font-bold text-indigo-900">My Civics Class</h1>
          <p className="font-display text-base font-semibold text-indigo-600">Teacher sign-in</p>
          <p className="mt-3 text-sm text-gray-600">
            This sign-in is only for the teacher who manages lessons.
          </p>
        </div>

        <div className="mt-6">
          <LoginButtons callbackUrl={callbackUrl} error={searchParams.error ?? null} />
        </div>

        {!isAllowlistConfigured() && (
          <p role="status" className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Teacher sign-in is switched off: no teacher address has been set up for this site
            yet (TEACHER_ALLOWED_EMAILS).
          </p>
        )}
      </div>

      <p className="mt-6 text-center text-base text-gray-700">
        Students: you do not sign in.{' '}
        <Link href="/student/dashboard" className="font-semibold text-indigo-700 underline">
          Go to your missions
        </Link>
      </p>
    </main>
  )
}
