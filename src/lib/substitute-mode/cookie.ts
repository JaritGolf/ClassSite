/**
 * Substitute Mode — Cookie helpers
 *
 * Sub mode is stored as a simple HttpOnly cookie.
 * When on, the middleware blocks all mutating API calls (POST/PATCH/DELETE)
 * to teacher/mastery/reading-load routes.
 *
 * Cookie spec: HttpOnly; Secure (production); SameSite=Strict; Path=/; Max-Age=86400
 */

import { cookies } from 'next/headers'

// `cq_` is the pre-rebrand prefix, kept ON PURPOSE: this is a live cookie name
// asserted by three test suites and hardcoded in src/middleware.ts. Renaming it
// would drop sub mode for anyone with an active session. Do not "fix" it.
export const SUB_MODE_COOKIE = 'cq_sub_mode'

/**
 * Returns true when substitute mode is currently active.
 * Reads the cookie from the server-side cookie store.
 */
export async function getSubMode(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get(SUB_MODE_COOKIE)?.value === '1'
}

/**
 * Set or clear substitute mode.
 * Called from the sub-mode toggle route handler.
 *
 * @param on - true to enable, false to disable
 */
export async function setSubMode(on: boolean): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SUB_MODE_COOKIE, on ? '1' : '0', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 86400,
  })
}
