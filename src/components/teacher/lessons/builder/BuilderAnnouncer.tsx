'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

/**
 * EXACTLY ONE polite live region for the whole builder, plus one assertive
 * node for errors.
 *
 * Several simultaneous live regions is the classic axe-clean-but-unusable
 * failure: every one of them competes to speak, and a screen-reader user hears
 * an interleaved mess. Reordering, adding, hiding and saving all announce
 * through this single channel.
 */
interface AnnouncerApi {
  /** Status updates: "moved to position 3 of 12", "Order saved." */
  announce: (message: string) => void
  /** Failures. Assertive, so it interrupts. */
  announceError: (message: string) => void
}

const AnnouncerContext = createContext<AnnouncerApi>({
  announce: () => {},
  announceError: () => {},
})

export function useAnnouncer(): AnnouncerApi {
  return useContext(AnnouncerContext)
}

export function BuilderAnnouncer({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const announce = useCallback((message: string) => {
    // Re-announce an identical message by clearing first — assistive tech
    // ignores a live region whose text did not change, and "moved down" twice
    // in a row is a real sequence.
    setStatus('')
    window.setTimeout(() => setStatus(message), 50)
  }, [])

  const announceError = useCallback((message: string) => {
    setError('')
    window.setTimeout(() => setError(message), 50)
  }, [])

  const api = useMemo(() => ({ announce, announceError }), [announce, announceError])

  return (
    <AnnouncerContext.Provider value={api}>
      {children}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {status}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="true" className="sr-only">
        {error}
      </div>
    </AnnouncerContext.Provider>
  )
}
