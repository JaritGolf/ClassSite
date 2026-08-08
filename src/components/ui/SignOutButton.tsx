'use client'

/**
 * Sign out — Client Component.
 *
 * WHY THIS EXISTS (it replaced a plain form on every nav):
 *
 * All five sign-out controls used to be a bare
 *   <form action="/api/auth/signout" method="POST">
 * with no CSRF token. NextAuth v4 rejects an unverified POST to /signout by
 * redirecting back instead of erroring, so the page reloaded looking identical
 * and the session survived — sign out appeared to do nothing at all. There was
 * no console error and no failed request to notice.
 *
 * signOut() from next-auth/react fetches the CSRF token itself, so the token
 * cookie's name is never hard-coded here. That matters: the cookie is
 * `next-auth.csrf-token` over http and `__Host-next-auth.csrf-token` over
 * https, so hand-rolling the hidden input would have worked locally and failed
 * in production — the exact drift this codebase has shipped before.
 *
 * The pending state is not decoration. "I click it and nothing happens" was the
 * reported symptom, so the control must always visibly acknowledge the click.
 */

import { useState } from 'react'
import { signOut } from 'next-auth/react'

interface SignOutButtonProps {
  /** Each nav keeps its own styling; this component owns behavior only. */
  className?: string
}

export function SignOutButton({ className }: SignOutButtonProps) {
  const [pending, setPending] = useState(false)

  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      aria-live="polite"
      onClick={async () => {
        setPending(true)
        try {
          // `redirect: false` and then navigating ourselves, deliberately.
          //
          // With NextAuth's own redirect, a relative callbackUrl is resolved
          // SERVER-side against NEXTAUTH_URL — so if that env var does not match
          // the origin the browser is actually on, signing out throws the user
          // at a different host. That is not hypothetical: locally NEXTAUTH_URL
          // is pinned to :3000, and a dev server on any other port sent people
          // to a dead origin. Navigating ourselves keeps the user on the origin
          // they are already using, whatever NEXTAUTH_URL says.
          await signOut({ redirect: false })
          // A full document load, not router.push: every role surface is a
          // Server Component reading the session, and a client-side navigation
          // can serve a cached RSC payload rendered while still signed in.
          window.location.href = '/login'
        } catch {
          // Re-enable so the button is not left permanently dead if the
          // request fails — the user needs to be able to try again.
          setPending(false)
        }
      }}
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
