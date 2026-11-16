'use client'

/**
 * Teacher sign-in button — Client Component.
 *
 * Students never sign in, so this page has one job: let the teacher/admin who
 * authors lessons sign in with Google. There is no demo or role-picker login.
 */

import { signIn } from 'next-auth/react'

interface LoginButtonsProps {
  callbackUrl: string
  error?: string | null
}

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed':
    'That Google account is not on the teacher list for this site. Only the teacher who manages lessons can sign in. Students do not need to sign in.',
  OAuthSignin: 'Could not start the sign-in process. Please try again.',
  OAuthCallback: 'There was a problem completing sign-in. Please try again.',
  OAuthAccountNotLinked: 'This email is already associated with a different sign-in method.',
  Default: 'An error occurred during sign-in. Please try again.',
}

export function LoginButtons({ callbackUrl, error }: LoginButtonsProps) {
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

      <button
        onClick={() => signIn('google', { callbackUrl })}
        className="flex items-center justify-center gap-3 rounded-2xl border-2 border-b-4 border-gray-300 bg-white px-6 py-3 font-display font-bold text-gray-700 transition-colors hover:bg-gray-50 active:translate-y-[2px] active:border-b-2"
      >
        Teacher sign-in with Google
      </button>
    </div>
  )
}
