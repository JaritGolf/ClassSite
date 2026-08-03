/**
 * Activity Sessions — pure sessionization logic.
 *
 * No DB, no I/O, no clock reads: every function takes the times it needs. This
 * is the unit-test surface for the whole feature (same posture as
 * spaced-retrieval/sm2.ts and adaptive-difficulty/transitions.ts).
 */

import {
  ACTIVE_DELTA_CAP_SECONDS,
  LIVE_IDLE_MINUTES,
  LIVE_ONLINE_MINUTES,
  SESSION_GAP_MINUTES,
  type ActivityArea,
} from './config'

/** Minimal shape the pure helpers need — satisfied by the Prisma row. */
export interface SessionLike {
  startedAt: Date
  lastActiveAt: Date
  endedAt: Date | null
  activeSeconds: number
  /** Prisma `Json | null`; read through parseAreaSeconds, never trusted raw. */
  areaSeconds?: unknown
  /** Plain TEXT column; validate with isActivityArea before using. */
  lastArea?: string | null
}

export type PresenceState = 'online' | 'idle' | 'offline'

export function secondsBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 1000))
}

/**
 * True when the gap since the last activity is long enough that the next touch
 * should start a fresh session rather than extend the current one.
 */
export function shouldOpenNewSession(
  lastActiveAt: Date,
  now: Date,
  gapMinutes: number = SESSION_GAP_MINUTES
): boolean {
  return secondsBetween(lastActiveAt, now) > gapMinutes * 60
}

/**
 * How much engaged time one touch contributes — the elapsed gap, capped.
 *
 * The cap is the whole point: a student who backgrounds the tab for 40 minutes
 * sends no pings, so without it the next ping would credit 40 idle minutes as
 * work. Capping also lets heartbeat pings and server-side work-touches
 * accumulate through the same path without double counting.
 */
export function activeDelta(
  lastActiveAt: Date,
  now: Date,
  capSeconds: number = ACTIVE_DELTA_CAP_SECONDS
): number {
  return Math.min(secondsBetween(lastActiveAt, now), capSeconds)
}

/** Wall-clock span of a session: first activity to last. */
export function sessionSpanSeconds(session: SessionLike): number {
  return secondsBetween(session.startedAt, session.endedAt ?? session.lastActiveAt)
}

/** Engaged minutes, rounded to the nearest minute for display. */
export function activeMinutes(session: SessionLike): number {
  return Math.round(session.activeSeconds / 60)
}

/** Wall-clock span in minutes, rounded for display. */
export function spanMinutes(session: SessionLike): number {
  return Math.round(sessionSpanSeconds(session) / 60)
}

/** Where a student sits on the live panel, based on their last activity. */
export function presenceState(lastActiveAt: Date, now: Date): PresenceState {
  const seconds = secondsBetween(lastActiveAt, now)
  if (seconds <= LIVE_ONLINE_MINUTES * 60) return 'online'
  if (seconds <= LIVE_IDLE_MINUTES * 60) return 'idle'
  return 'offline'
}

// ── Area accounting ──────────────────────────────────────────────────────────

export type AreaSeconds = Partial<Record<ActivityArea, number>>

/**
 * Read a persisted `areaSeconds` JSON value defensively. Unknown keys and
 * non-numeric values are dropped rather than trusted, since this column is
 * JSON and therefore unvalidated by the database.
 */
export function parseAreaSeconds(raw: unknown): AreaSeconds {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      out[key] = Math.floor(value)
    }
  }
  return out as AreaSeconds
}

/** Immutably add `delta` seconds to one area's tally. */
export function addAreaSeconds(
  current: unknown,
  area: ActivityArea,
  delta: number
): AreaSeconds {
  const parsed = parseAreaSeconds(current)
  if (delta <= 0) return parsed
  return { ...parsed, [area]: (parsed[area] ?? 0) + delta }
}

/** Sum two area maps — used when merging split sessions. */
export function sumAreaSeconds(a: unknown, b: unknown): AreaSeconds {
  const left = parseAreaSeconds(a)
  const right = parseAreaSeconds(b)
  const out: AreaSeconds = { ...left }
  for (const [key, value] of Object.entries(right)) {
    const area = key as ActivityArea
    out[area] = (out[area] ?? 0) + value
  }
  return out
}

/** Area tallies as sorted display rows, largest first, zero areas omitted. */
export function areaBreakdown(
  raw: unknown
): Array<{ area: ActivityArea; minutes: number }> {
  return Object.entries(parseAreaSeconds(raw))
    .map(([area, seconds]) => ({
      area: area as ActivityArea,
      minutes: Math.round(seconds / 60),
    }))
    .filter((row) => row.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)
}

// ── Defensive merge ──────────────────────────────────────────────────────────

/**
 * Collapse rows that are really one session.
 *
 * Two requests arriving simultaneously for a student with no open session can
 * each create one (see the ADR — we accept that race rather than locking a hot
 * write path). The only symptom is one session stored as two adjacent rows, so
 * the read model merges any pair whose gap is under the session threshold.
 *
 * Input may be in any order; output is ascending by `startedAt`.
 */
export function mergeAdjacentSessions<T extends SessionLike>(
  sessions: readonly T[],
  gapMinutes: number = SESSION_GAP_MINUTES
): T[] {
  const sorted = [...sessions].sort(
    (a, b) => a.startedAt.getTime() - b.startedAt.getTime()
  )
  const merged: T[] = []
  for (const session of sorted) {
    const previous = merged[merged.length - 1]
    if (
      previous &&
      !shouldOpenNewSession(previous.lastActiveAt, session.startedAt, gapMinutes)
    ) {
      merged[merged.length - 1] = {
        ...previous,
        lastActiveAt:
          session.lastActiveAt > previous.lastActiveAt
            ? session.lastActiveAt
            : previous.lastActiveAt,
        // The merged session ends when the LATER row ends — null if still open.
        endedAt: session.endedAt,
        activeSeconds: previous.activeSeconds + session.activeSeconds,
        areaSeconds: sumAreaSeconds(previous.areaSeconds, session.areaSeconds),
        // Current area comes from the later row — that is where they ended up.
        lastArea: session.lastArea ?? previous.lastArea ?? null,
      }
      continue
    }
    merged.push({ ...session })
  }
  return merged
}
