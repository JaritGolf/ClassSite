/**
 * Activity Sessions — the write path.
 *
 * `touchActivity` is the single entry point for recording that a student is
 * working. It is called from two places:
 *
 *   1. The client heartbeat (`POST /api/student/activity/ping`) — roughly once
 *      a minute while the tab is visible and the student is not idle. This is
 *      what captures time spent reading a lesson, which leaves no other trace.
 *   2. Server-side, alongside the existing streak `recordActivity` calls on
 *      real graded work, so a session always exists around a submission even if
 *      client JS never ran.
 *
 * Both paths accumulate through the same bounded-delta logic, so calling both
 * for the same moment cannot double-count.
 */

import { prisma } from '@/lib/db'
import {
  SESSION_GAP_MINUTES,
  WRITE_DEBOUNCE_SECONDS,
  isActivityArea,
  type ActivityArea,
} from './config'
import {
  activeDelta,
  addAreaSeconds,
  secondsBetween,
  shouldOpenNewSession,
} from './sessionize'

export interface TouchOptions {
  /** When the activity happened. Defaults to now. */
  at?: Date
  /** Which part of the app. Defaults to 'other'. */
  area?: ActivityArea
  /** True when a genuine sign-in triggered this touch. */
  viaLogin?: boolean
}

export type TouchOutcome =
  | 'opened'
  | 'extended'
  | 'debounced'

export interface TouchResult {
  sessionId: string
  outcome: TouchOutcome
}

/**
 * Record activity for a student, opening or extending their session.
 *
 * Returns which of the three things happened, which the tests assert on.
 */
export async function touchActivity(
  studentId: string,
  options: TouchOptions = {}
): Promise<TouchResult> {
  const at = options.at ?? new Date()
  const area: ActivityArea = options.area ?? 'other'
  const viaLogin = options.viaLogin ?? false

  const current = await prisma.studentActivitySession.findFirst({
    where: { studentId },
    orderBy: { startedAt: 'desc' },
    select: {
      id: true,
      startedAt: true,
      lastActiveAt: true,
      endedAt: true,
      activeSeconds: true,
      areaSeconds: true,
      lastArea: true,
    },
  })

  const needsNewSession =
    current === null ||
    current.endedAt !== null ||
    shouldOpenNewSession(current.lastActiveAt, at)

  if (needsNewSession) {
    // Close the previous session at its own last activity, never at `at` —
    // the intervening idle time was not work.
    if (current !== null && current.endedAt === null) {
      await prisma.studentActivitySession.update({
        where: { id: current.id },
        data: { endedAt: current.lastActiveAt },
      })
    }

    const created = await prisma.studentActivitySession.create({
      data: {
        studentId,
        startedAt: at,
        lastActiveAt: at,
        // The opening moment itself is a point in time, not a duration — but
        // we still know WHERE they are, which the live panel needs immediately.
        activeSeconds: 0,
        areaSeconds: {},
        lastArea: area,
        startedByLogin: viaLogin,
      },
      select: { id: true },
    })
    return { sessionId: created.id, outcome: 'opened' }
  }

  // Drop near-simultaneous touches (a heartbeat landing next to a submit).
  // A debounced touch that reports a DIFFERENT area still updates the current
  // area — the student really did just navigate — but adds no time.
  if (secondsBetween(current.lastActiveAt, at) < WRITE_DEBOUNCE_SECONDS) {
    if (current.lastArea !== area) {
      await prisma.studentActivitySession.update({
        where: { id: current.id },
        data: { lastArea: area },
      })
    }
    return { sessionId: current.id, outcome: 'debounced' }
  }

  const delta = activeDelta(current.lastActiveAt, at)

  await prisma.studentActivitySession.update({
    where: { id: current.id },
    data: {
      lastActiveAt: at,
      activeSeconds: { increment: delta },
      // Elapsed time is credited to where they WERE, not where they now are:
      // the ping that reports 'drill' is telling us they spent the last minute
      // getting there from wherever lastArea said they were.
      // lastArea is a plain TEXT column, so validate rather than trust it.
      areaSeconds: addAreaSeconds(
        current.areaSeconds,
        isActivityArea(current.lastArea) ? current.lastArea : area,
        delta
      ),
      lastArea: area,
      // A sign-in mid-session retroactively marks the session as login-started.
      ...(viaLogin ? { startedByLogin: true } : {}),
    },
  })

  return { sessionId: current.id, outcome: 'extended' }
}

/**
 * Fire-and-forget wrapper for hot student request paths.
 *
 * Activity tracking must never be able to fail a submission or a page render,
 * so every caller in a student flow goes through this. Mirrors how the existing
 * `updateProgressAfterAttempt` hook is wrapped in the submit route.
 */
export async function touchActivitySafe(
  studentId: string,
  options: TouchOptions = {}
): Promise<void> {
  try {
    await touchActivity(studentId, options)
  } catch (err) {
    console.error(
      '[activity-sessions] touch failed:',
      err instanceof Error ? err.message : String(err)
    )
  }
}

/**
 * Close sessions whose last activity is older than the gap threshold.
 *
 * Report hygiene only — an open row is already treated as ending at
 * `lastActiveAt` everywhere it is read, so this changes no numbers. Called
 * lazily from the report builders rather than by a cron, matching the existing
 * lazy-snapshot approach in eoc-analytics/snapshot.ts (ADR 0011: no cron).
 */
export async function closeStaleSessions(
  studentIds: readonly string[],
  now: Date = new Date(),
  gapMinutes: number = SESSION_GAP_MINUTES
): Promise<number> {
  if (studentIds.length === 0) return 0
  const cutoff = new Date(now.getTime() - gapMinutes * 60 * 1000)
  const stale = await prisma.studentActivitySession.findMany({
    where: {
      studentId: { in: [...studentIds] },
      endedAt: null,
      lastActiveAt: { lt: cutoff },
    },
    select: { id: true, lastActiveAt: true },
  })
  if (stale.length === 0) return 0
  await prisma.$transaction(
    stale.map((s) =>
      prisma.studentActivitySession.update({
        where: { id: s.id },
        data: { endedAt: s.lastActiveAt },
      })
    )
  )
  return stale.length
}
