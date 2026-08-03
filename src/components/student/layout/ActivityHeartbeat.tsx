'use client'

/**
 * ActivityHeartbeat — invisible presence/duration signal.
 *
 * Mounted once in the student layout, so every student page reports without
 * per-page wiring (same single-application-point reasoning as the accessibility
 * theming wrapper).
 *
 * Renders nothing and shows the student nothing. There is deliberately no
 * visible timer or countdown: break nudges are `PauseBanner`'s job, and
 * timer-based pressure is off the table for this product.
 *
 * What makes the reported "active time" honest:
 *   - pings stop while the tab is hidden (backgrounded tab adds nothing)
 *   - pings stop after IDLE_AFTER_MS with no mouse/key/touch/scroll input, and
 *     resume on the next interaction
 *   - the server additionally caps how much any single ping can credit, so even
 *     a pathological client cannot inflate the number
 *
 * Privacy: sends only a bucketed area name derived from the pathname (e.g.
 * "mission"), never the raw path, and never any identifier — the student is
 * resolved server-side from the session cookie.
 */

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import {
  PING_INTERVAL_SECONDS,
  areaFromPathname,
} from '@/lib/activity-sessions/config'

const PING_URL = '/api/student/activity/ping'
/** Stop pinging after this long with no user interaction. */
const IDLE_AFTER_MS = 5 * 60 * 1000

export function ActivityHeartbeat() {
  const pathname = usePathname()
  // Kept in refs so the interval closure always sees current values without
  // being torn down and rebuilt on every navigation or mouse move.
  const areaRef = useRef(areaFromPathname(pathname))
  const lastInteractionRef = useRef(Date.now())

  areaRef.current = areaFromPathname(pathname)

  useEffect(() => {
    let cancelled = false

    function markInteraction() {
      lastInteractionRef.current = Date.now()
    }

    function send() {
      if (cancelled) return
      if (document.visibilityState === 'hidden') return
      if (Date.now() - lastInteractionRef.current > IDLE_AFTER_MS) return
      void fetch(PING_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area: areaRef.current }),
        // Activity data is never worth surfacing an error to a student over.
        keepalive: true,
      }).catch(() => {
        /* offline or navigating away — the next ping will cover it */
      })
    }

    function handleVisibilityChange() {
      // Coming back to the tab counts as interaction, and ends the session's
      // idle stretch immediately rather than waiting for the next interval.
      if (document.visibilityState === 'visible') {
        markInteraction()
        send()
      }
    }

    function handlePageHide() {
      // Best-effort final flush so the session's last minute is not lost.
      // sendBeacon survives unload where fetch does not.
      if (Date.now() - lastInteractionRef.current > IDLE_AFTER_MS) return
      try {
        navigator.sendBeacon?.(
          PING_URL,
          new Blob([JSON.stringify({ area: areaRef.current })], {
            type: 'application/json',
          })
        )
      } catch {
        /* nothing useful to do during unload */
      }
    }

    const interactionEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'touchstart',
      'scroll',
    ] as const
    for (const event of interactionEvents) {
      window.addEventListener(event, markInteraction, { passive: true })
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageHide)

    // Open the session immediately on mount so "when they got on" is accurate
    // to the moment they arrived, not to the first interval tick.
    send()
    const timer = window.setInterval(send, PING_INTERVAL_SECONDS * 1000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      for (const event of interactionEvents) {
        window.removeEventListener(event, markInteraction)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [])

  return null
}
