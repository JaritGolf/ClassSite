'use client'

/**
 * Client-side session provider wrapper.
 *
 * Wraps the app with next-auth's SessionProvider so client components
 * can use useSession() in later phases. The session is fetched lazily
 * on first client render (no refetchInterval — no polling).
 *
 * Usage: imported in src/app/layout.tsx (Server Component).
 */

import { SessionProvider } from 'next-auth/react'

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
