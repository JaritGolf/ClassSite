'use client'

/**
 * Focus Mode client — the browser half of assessment integrity.
 *
 * What it CAN do: request fullscreen, block copy/cut/paste/right-click, and
 * notice when the page loses focus or is hidden.
 * What it CANNOT do: stop the student. A browser tab cannot lock a Chromebook —
 * that is the device-management layer's job (docs/chromebook-lockdown.md). So
 * this hook's real product is an honest, teacher-visible record.
 *
 * Two deliberate choices that keep the record trustworthy:
 *
 * 1. ONE event per away episode. A single tab switch fires BOTH `blur` and
 *    `visibilitychange`; naively listening to both double-counts every
 *    departure. An episode opens on whichever fires first and closes on the
 *    student's return, emitting a single event with a duration.
 *
 * 2. Episodes shorter than MIN_AWAY_MS are discarded. A stray click on browser
 *    chrome blurs the window for ~100ms and is not someone looking up an
 *    answer. Flagging that noise would erode the teacher's trust in the signal,
 *    which is the only thing that makes this feature worth having.
 *
 * Accommodation exemption: while a sanctioned break is active (ACC-BREAKS and
 * the PauseBanner actively tell students to step away), NO events are recorded
 * at all. Flagging a student for using their accommodation would be a defect.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  buildIntegrityReportBody,
  type IntegrityEventEntry,
  type IntegrityEventType,
} from '@/lib/assessment/wire'

/** Away episodes shorter than this are treated as noise and discarded. */
export const MIN_AWAY_MS = 750

/** How long to batch events before POSTing. Short, because submitting the
 *  assessment closes the attempt and the server then refuses late events. */
const FLUSH_DEBOUNCE_MS = 2000

interface UseSecureModeArgs {
  assessmentId: string
  attemptId: string | null
  /** Server-resolved. When false the hook installs no listeners whatsoever. */
  enabled: boolean
  /** Element to make fullscreen. Ignored when requireFullscreen is false. */
  containerRef: React.RefObject<HTMLElement>
  /**
   * Standalone secure assessments go fullscreen behind a Begin gate. Embedded
   * ones (a readiness check inside the mission flow) record and block but do
   * NOT seize the screen mid-mission.
   */
  requireFullscreen: boolean
}

export interface SecureModeApi {
  /** Number of integrity events recorded this attempt (for the notice). */
  eventCount: number
  /** Bumped on every new event so the notice can re-announce itself. */
  lastEventAt: number | null
  /** True once the student has passed the Begin gate. */
  started: boolean
  /** True while a sanctioned break is active — nothing is recorded. */
  onBreak: boolean
  /** Call from a real click (fullscreen needs a user gesture). */
  begin: () => Promise<void>
  startBreak: () => void
  endBreak: () => Promise<void>
  /** Send anything queued right now. Await this before submitting. */
  flush: () => Promise<void>
}

export function useSecureMode({
  assessmentId,
  attemptId,
  enabled,
  containerRef,
  requireFullscreen,
}: UseSecureModeArgs): SecureModeApi {
  const [eventCount, setEventCount] = useState(0)
  const [lastEventAt, setLastEventAt] = useState<number | null>(null)
  const [started, setStarted] = useState(false)
  const [onBreak, setOnBreak] = useState(false)

  // Refs mirror the state that event listeners read: the listeners are
  // installed once and must never close over a stale value.
  const queueRef = useRef<IntegrityEventEntry[]>([])
  const awaySinceRef = useRef<number | null>(null)
  const awayTypeRef = useRef<IntegrityEventType | null>(null)
  const onBreakRef = useRef(false)
  const enteredFullscreenRef = useRef(false)
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptIdRef = useRef<string | null>(attemptId)

  useEffect(() => {
    attemptIdRef.current = attemptId
  }, [attemptId])

  // ── Flush ───────────────────────────────────────────────────────────────────

  const flush = useCallback(async () => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current)
      flushTimerRef.current = null
    }

    const id = attemptIdRef.current
    const batch = queueRef.current
    if (!id || batch.length === 0) return
    // Clear before awaiting so concurrent events queue behind this send rather
    // than being sent twice.
    queueRef.current = []

    try {
      await fetch(`/api/assessment/${assessmentId}/integrity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildIntegrityReportBody(id, batch)),
        // Survives the page being torn down mid-request.
        keepalive: true,
      })
    } catch (err) {
      // Deliberately swallowed and NOT re-queued. Losing an integrity event
      // must never block a student from finishing a test, and re-queueing on a
      // terminal error (e.g. 409 after submit) would spin forever.
      console.warn(
        '[secure-mode] integrity report failed',
        err instanceof Error ? err.message : err
      )
    }
  }, [assessmentId])

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) return
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null
      void flush()
    }, FLUSH_DEBOUNCE_MS)
  }, [flush])

  const enqueue = useCallback(
    (eventType: IntegrityEventType, durationMs?: number) => {
      if (onBreakRef.current) return
      queueRef.current.push({
        eventType,
        ...(durationMs !== undefined ? { durationMs } : {}),
      })
      setEventCount((n) => n + 1)
      setLastEventAt(Date.now())
      scheduleFlush()
    },
    [scheduleFlush]
  )

  // ── Away-episode bookkeeping ────────────────────────────────────────────────

  const openEpisode = useCallback((type: IntegrityEventType) => {
    if (onBreakRef.current) return
    // Already away — do not open a second episode for the same departure.
    if (awaySinceRef.current !== null) return
    awaySinceRef.current = Date.now()
    awayTypeRef.current = type
  }, [])

  const closeEpisode = useCallback(() => {
    const since = awaySinceRef.current
    const type = awayTypeRef.current
    awaySinceRef.current = null
    awayTypeRef.current = null
    if (since === null || type === null) return

    const elapsed = Date.now() - since
    if (elapsed < MIN_AWAY_MS) return // noise — see header note
    enqueue(type, elapsed)
  }, [enqueue])

  // ── Listeners ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!enabled || !attemptId) return

    const onVisibility = () => {
      if (document.hidden) openEpisode('VISIBILITY_HIDDEN')
      else closeEpisode()
    }
    const onBlur = () => {
      // A blur while the page is still visible means another window took focus.
      // If the page is also hidden, visibilitychange already opened the episode
      // with the more specific type.
      if (!document.hidden) openEpisode('BLUR')
    }
    const onFocus = () => closeEpisode()

    const onFullscreenChange = () => {
      if (!enteredFullscreenRef.current) return
      if (document.fullscreenElement === null) {
        enteredFullscreenRef.current = false
        enqueue('FULLSCREEN_EXIT')
      }
    }

    const block = (type: IntegrityEventType) => (e: Event) => {
      e.preventDefault()
      enqueue(type)
    }
    const onCopy = block('COPY_BLOCKED')
    const onCut = block('CUT_BLOCKED')
    const onPaste = block('PASTE_BLOCKED')
    const onContextMenu = block('CONTEXT_MENU_BLOCKED')
    // Printing cannot actually be prevented from a page; record the attempt.
    const onBeforePrint = () => enqueue('PRINT_BLOCKED')

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    document.addEventListener('copy', onCopy)
    document.addEventListener('cut', onCut)
    document.addEventListener('paste', onPaste)
    document.addEventListener('contextmenu', onContextMenu)
    window.addEventListener('beforeprint', onBeforePrint)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      document.removeEventListener('copy', onCopy)
      document.removeEventListener('cut', onCut)
      document.removeEventListener('paste', onPaste)
      document.removeEventListener('contextmenu', onContextMenu)
      window.removeEventListener('beforeprint', onBeforePrint)
    }
  }, [enabled, attemptId, openEpisode, closeEpisode, enqueue])

  // Final flush on unmount — a student navigating away mid-assessment should
  // not silently drop what was already observed.
  useEffect(() => {
    return () => {
      void flush()
    }
  }, [flush])

  // ── Controls ────────────────────────────────────────────────────────────────

  const begin = useCallback(async () => {
    setStarted(true)
    if (!requireFullscreen) return
    const el = containerRef.current
    if (!el?.requestFullscreen) return
    try {
      await el.requestFullscreen()
      enteredFullscreenRef.current = true
    } catch {
      // Fullscreen can be refused (permissions policy, an already-fullscreen
      // ancestor, no user gesture). Focus Mode still records and blocks — it is
      // deliberately not a hard requirement, because a student must never be
      // locked out of a graded assessment by a browser quirk.
      enteredFullscreenRef.current = false
    }
  }, [requireFullscreen, containerRef])

  const startBreak = useCallback(() => {
    // Close any open episode WITHOUT recording it, then go quiet.
    awaySinceRef.current = null
    awayTypeRef.current = null
    onBreakRef.current = true
    setOnBreak(true)
  }, [])

  const endBreak = useCallback(async () => {
    onBreakRef.current = false
    setOnBreak(false)
    // Re-enter fullscreen if the break dropped out of it. This runs from the
    // "I'm ready" click, so it still counts as a user gesture.
    if (requireFullscreen && document.fullscreenElement === null) {
      const el = containerRef.current
      if (el?.requestFullscreen) {
        try {
          await el.requestFullscreen()
          enteredFullscreenRef.current = true
        } catch {
          enteredFullscreenRef.current = false
        }
      }
    }
  }, [requireFullscreen, containerRef])

  return {
    eventCount,
    lastEventAt,
    started,
    onBreak,
    begin,
    startBreak,
    endBreak,
    flush,
  }
}
