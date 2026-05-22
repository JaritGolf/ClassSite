/**
 * SubModeBanner — Server Component
 *
 * Reads the sub-mode cookie server-side.
 * Shows an indigo banner with a lock icon when substitute mode is on.
 * Returns null when sub-mode is off.
 */

import { getSubMode } from '@/lib/substitute-mode'

export async function SubModeBanner() {
  const on = await getSubMode()
  if (!on) return null

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-center gap-2 bg-indigo-700 px-4 py-2 text-sm font-medium text-white"
    >
      {/* Lock icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-4 w-4 flex-shrink-0"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
          clipRule="evenodd"
        />
      </svg>
      Substitute mode — read-only. Write actions are blocked.
      <a
        href="/teacher/settings"
        className="ml-auto underline hover:no-underline"
      >
        Turn off
      </a>
    </div>
  )
}
