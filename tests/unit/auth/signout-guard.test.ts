/**
 * Sign out must never go back to a bare, CSRF-less form POST.
 *
 * THE BUG THIS GUARDS AGAINST (it shipped, and it was invisible):
 *
 * Every nav used to render
 *   <form action="/api/auth/signout" method="POST">
 * with no csrfToken field. NextAuth v4 does not error on an unverified POST to
 * /signout — it redirects back. So the page reloaded looking identical, the
 * session survived, and sign out appeared to do nothing. No console error, no
 * failed request, nothing in the server log. Users on a shared Chromebook could
 * not switch accounts at all.
 *
 * It is easy to reintroduce: a plain form is the obvious way to write a
 * sign-out control, it looks correct in review, and no functional test catches
 * it because the endpoint returns a redirect either way. So this is a static
 * source scan, in the same spirit as the audit17/04 analytics guard.
 *
 * Pure filesystem scan — no DB, no rendering.
 */

import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

const SRC_ROOT = join(__dirname, '../../../src')

/**
 * The single sanctioned implementation. It calls signOut() from
 * next-auth/react, which obtains the CSRF token itself, and it names the
 * endpoint only inside an explanatory comment.
 */
const SIGNOUT_COMPONENT = 'components/ui/SignOutButton.tsx'

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...walk(full))
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
      out.push(full)
    }
  }
  return out
}

/** Strip comments so an explanatory mention of the old markup is not a hit. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

describe('sign out', () => {
  it('is never wired as a bare form POST to /api/auth/signout', () => {
    const offenders = walk(SRC_ROOT)
      .filter((file) =>
        /<form[^>]*action=["']\/api\/auth\/signout/.test(stripComments(readFileSync(file, 'utf8')))
      )
      .map((file) => file.slice(SRC_ROOT.length + 1))

    expect(offenders).toEqual([])
  })

  it('routes every sign-out control through the one shared component', () => {
    const rendering = walk(SRC_ROOT)
      .filter((file) => file.slice(SRC_ROOT.length + 1) !== SIGNOUT_COMPONENT)
      .filter((file) => />\s*Sign out\s*</.test(readFileSync(file, 'utf8')))
      .map((file) => file.slice(SRC_ROOT.length + 1))

    // Nobody but SignOutButton should be rendering the label itself.
    expect(rendering).toEqual([])
  })

  // The negative assertions below scan CODE only. The component's own comments
  // name both `csrf-token` and `callbackUrl` while explaining why it avoids
  // them, and prose must not count as a violation.
  it('obtains the CSRF token via next-auth/react rather than hand-rolling it', () => {
    const code = stripComments(readFileSync(join(SRC_ROOT, SIGNOUT_COMPONENT), 'utf8'))

    expect(code).toMatch(/from 'next-auth\/react'/)
    expect(code).toMatch(/signOut\(/)

    // Reading the cookie by name would work locally and break in production:
    // it is `next-auth.csrf-token` over http but `__Host-next-auth.csrf-token`
    // over https. Let the library resolve it.
    expect(code).not.toMatch(/csrf-token/)
  })

  it('does not depend on NEXTAUTH_URL to land the user back on this origin', () => {
    const code = stripComments(readFileSync(join(SRC_ROOT, SIGNOUT_COMPONENT), 'utf8'))

    // A relative callbackUrl is resolved SERVER-side against NEXTAUTH_URL, so
    // a mismatch throws the user at a different host — observed locally, where
    // NEXTAUTH_URL is pinned to :3000 and a dev server on another port sent
    // people to a dead origin. Navigate client-side instead.
    expect(code).toMatch(/redirect:\s*false/)
    expect(code).not.toMatch(/callbackUrl/)
  })
})
