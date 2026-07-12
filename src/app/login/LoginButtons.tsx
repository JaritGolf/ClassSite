'use client'

/**
 * Login page interactive buttons — Client Component.
 *
 * Split from login/page.tsx (Server Component) so:
 *   - signIn() from next-auth/react (client-only) can be called on click
 *   - showMockPanel is passed as a prop from the server (never exposed as NEXT_PUBLIC_*)
 *   - error messages from ?error= query param are rendered
 */

import { signIn } from 'next-auth/react'

const MOCK_ROLES = ['STUDENT', 'TEACHER', 'PARENT', 'ADMIN'] as const

interface LoginButtonsProps {
  callbackUrl: string
  showMockPanel: boolean
  error?: string | null
}

const ERROR_MESSAGES: Record<string, string> = {
  'pending-approval':
    'Your account is pending administrator approval. Contact your school administrator to activate your account.',
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
    <div className="flex flex-col gap-4 w-full max-w-sm">
      {errorMessage && (
        <div
          role="alert"
          className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800"
        >
          {errorMessage}
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

      {/* Dev-only mock panel — only rendered when showMockPanel=true (server-checked) */}
      {showMockPanel && (
        <div className="mt-4 rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 p-4">
          <p className="mb-2 text-xs font-mono font-bold text-amber-700 uppercase tracking-wide">
            ⚠ Dev Only — Mock Auth
          </p>
          <p className="mb-3 text-xs text-amber-600">
            Quick sign-in as any role. Never available in production.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {MOCK_ROLES.map((role) => (
              <button
                key={role}
                onClick={() => signIn('mock-credentials', { role, callbackUrl })}
                className="rounded border border-amber-300 bg-white px-3 py-1.5 text-xs font-mono font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
