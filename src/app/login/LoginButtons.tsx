'use client'

/**
 * Login page interactive buttons — Client Component.
 *
 * Split from login/page.tsx (Server Component) so:
 *   - signIn() from next-auth/react (client-only) can be called on click
 *   - showMockPanel is passed as a prop from the server (never exposed as NEXT_PUBLIC_*)
 *   - error messages from ?error= query param are rendered
 *
 * When showMockPanel is on, the four one-click role buttons lead — they are the
 * primary action for demo visitors — and the school SSO buttons sit below a
 * divider. The panel is deliberately styled apart from the SSO buttons: with no
 * site-wide demo banner, it is the only at-a-glance signal that the site is
 * currently open to anyone.
 */

import { signIn } from 'next-auth/react'
import { TrackIcon, type TrackIconName } from '@/components/ui/TrackIcon'
import { ROLE_HOME } from '@/lib/auth/role-home'
import type { UserRole } from '@prisma/client'

interface DemoRole {
  role: UserRole
  label: string
  blurb: string
  icon: TrackIconName
  /**
   * Demo-only landing override. ADMIN's real home (/admin/users) is still a
   * Phase-9 stub reading "coming in Phase 9" — a poor first screen for someone
   * being shown the site. Sending demo visitors to a real, populated admin page
   * instead, without changing where a genuine admin sign-in lands.
   */
  demoHome?: string
}

const DEMO_ROLES: DemoRole[] = [
  { role: 'STUDENT', label: 'Student', blurb: 'Missions & drills', icon: 'map' },
  { role: 'TEACHER', label: 'Teacher', blurb: 'Class dashboard', icon: 'target' },
  { role: 'PARENT',  label: 'Parent',  blurb: 'Family progress', icon: 'home' },
  { role: 'ADMIN',   label: 'Admin',   blurb: 'District tools',  icon: 'shield',
    demoHome: '/admin/audit' },
]

interface LoginButtonsProps {
  callbackUrl: string
  showMockPanel: boolean
  error?: string | null
}

const ERROR_MESSAGES: Record<string, string> = {
  'pending-approval':
    'Your account is pending administrator approval. Contact your school administrator to activate your account.',
  'domain-not-allowed':
    'That Google account is not from an approved district domain. Sign in with your school account, or contact your school administrator.',
  OAuthSignin:
    'Could not start the sign-in process. Please try again.',
  OAuthCallback:
    'There was a problem completing sign-in. Please try again.',
  OAuthAccountNotLinked:
    'This email is already associated with a different sign-in method.',
  Default:
    'An error occurred during sign-in. Please try again.',
}

export function LoginButtons({ callbackUrl, showMockPanel, error }: LoginButtonsProps) {
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default) : null

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      {errorMessage && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {errorMessage}
        </div>
      )}

      {/* Open demo panel — rendered only when the server says mock auth is on */}
      {showMockPanel && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
          <p className="font-display text-base font-bold text-amber-900">
            Explore the demo
          </p>
          <p className="mt-0.5 text-sm text-amber-800">
            Pick a role to look around. No account needed — this is sample data.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {DEMO_ROLES.map(({ role, label, blurb, icon, demoHome }) => (
              <button
                key={role}
                onClick={() =>
                  signIn('mock-credentials', {
                    role,
                    // Land on the role's own home. A non-default callbackUrl
                    // means the visitor was bounced off a protected page — send
                    // them back there instead.
                    callbackUrl:
                      callbackUrl === '/'
                        ? (demoHome ?? ROLE_HOME[role])
                        : callbackUrl,
                  })
                }
                className="flex flex-col items-start gap-1 rounded-xl border-2 border-b-4 border-amber-300 bg-white px-3 py-2.5 text-left transition-colors hover:bg-amber-100 active:translate-y-[2px] active:border-b-2"
              >
                <TrackIcon name={icon} className="h-5 w-5 text-amber-700" />
                <span className="font-display text-sm font-bold text-amber-900">
                  {label}
                </span>
                <span className="text-xs leading-tight text-amber-700">{blurb}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showMockPanel && (
        <div className="flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            or
          </span>
          <span className="h-px flex-1 bg-gray-200" />
        </div>
      )}

      {/* Primary SSO */}
      <button
        onClick={() => signIn('clever', { callbackUrl })}
        className="flex items-center justify-center gap-3 rounded-2xl border-b-4 border-[#2547b3] bg-[#4274f6] px-6 py-3 font-display font-bold text-white transition-colors hover:bg-[#2f5de0] active:translate-y-[3px] active:border-b-0"
      >
        Sign in with Clever
      </button>

      {/* Fallback */}
      <button
        onClick={() => signIn('google', { callbackUrl })}
        className="flex items-center justify-center gap-3 rounded-2xl border-2 border-b-4 border-gray-300 bg-white px-6 py-3 font-display font-bold text-gray-700 transition-colors hover:bg-gray-50 active:translate-y-[2px] active:border-b-2"
      >
        Sign in with Google
      </button>
    </div>
  )
}
