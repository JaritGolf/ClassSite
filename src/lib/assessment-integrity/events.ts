/**
 * Integrity event recording.
 *
 * Everything a client reports here is UNTRUSTED and advisory. The guards below
 * exist so that a tampered client can neither fabricate a clean record for
 * itself nor pollute another student's record:
 *
 *   - ownership: the attempt must belong to the reporting student
 *   - post-submit: once submittedAt is set, no further events are accepted,
 *     so a record cannot be padded after the fact
 *   - cap: a bounded number of rows per attempt, so a loop in a hostile client
 *     cannot flood the table
 *   - recordedAt is the DB default (server clock) — the wire contract has no
 *     timestamp field at all
 *
 * Nothing recorded here affects grading, mastery, SM-2, or analytics. It is
 * teacher-visible context only (rule: the app flags, the teacher decides).
 */

import { prisma } from '@/lib/db'
import {
  MAX_REPORTED_DURATION_MS,
  type IntegrityEventEntry,
} from '@/lib/assessment/wire'

/**
 * Hard ceiling on stored events per attempt. A well-behaved client on a rough
 * network reports maybe a few dozen; 200 is far above real use and far below
 * anything that would matter to the table.
 */
export const MAX_EVENTS_PER_ATTEMPT = 200

export class IntegrityError extends Error {
  constructor(
    message: string,
    public readonly code: 'NOT_FOUND' | 'FORBIDDEN' | 'ALREADY_SUBMITTED'
  ) {
    super(message)
    this.name = 'IntegrityError'
  }
}

export interface RecordIntegrityResult {
  recorded: number
  /** Dropped because the per-attempt cap was already reached. */
  skipped: number
  totalForAttempt: number
}

/**
 * Persist a batch of integrity events for an in-progress attempt.
 *
 * @throws IntegrityError NOT_FOUND if the attempt does not exist
 * @throws IntegrityError FORBIDDEN if the attempt belongs to another student
 * @throws IntegrityError ALREADY_SUBMITTED if the attempt is already graded
 */
export async function recordIntegrityEvents(
  attemptId: string,
  studentId: string,
  events: readonly IntegrityEventEntry[]
): Promise<RecordIntegrityResult> {
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    select: { id: true, studentId: true, submittedAt: true },
  })

  if (!attempt) {
    throw new IntegrityError(`Attempt ${attemptId} not found`, 'NOT_FOUND')
  }

  // Ownership guard — mirrors gradeAndSubmit. Without this, any signed-in
  // student could write integrity events onto a classmate's attempt.
  if (attempt.studentId !== studentId) {
    throw new IntegrityError(
      'Attempt does not belong to this student',
      'FORBIDDEN'
    )
  }

  // A graded attempt is closed. Accepting late events would let a client
  // rewrite the record of a test it has already finished.
  if (attempt.submittedAt !== null) {
    throw new IntegrityError(
      'Attempt has already been submitted',
      'ALREADY_SUBMITTED'
    )
  }

  const existing = await prisma.attemptIntegrityEvent.count({
    where: { attemptId },
  })

  const room = Math.max(0, MAX_EVENTS_PER_ATTEMPT - existing)
  const accepted = events.slice(0, room)
  const skipped = events.length - accepted.length

  if (accepted.length > 0) {
    await prisma.attemptIntegrityEvent.createMany({
      data: accepted.map((e) => ({
        attemptId,
        eventType: e.eventType,
        // Clamp defensively even though the route's zod schema already bounds
        // it — this function is also called directly from tests and seeds.
        durationMs:
          typeof e.durationMs === 'number' && e.durationMs > 0
            ? Math.min(Math.round(e.durationMs), MAX_REPORTED_DURATION_MS)
            : null,
        // recordedAt deliberately omitted: the DB default is the server clock.
      })),
    })
  }

  return {
    recorded: accepted.length,
    skipped,
    totalForAttempt: existing + accepted.length,
  }
}

/** All integrity events for one attempt, oldest first. */
export async function getIntegrityEventsForAttempt(attemptId: string) {
  return prisma.attemptIntegrityEvent.findMany({
    where: { attemptId },
    orderBy: { recordedAt: 'asc' },
    select: { eventType: true, durationMs: true, recordedAt: true },
  })
}

/**
 * Summarizable events for many attempts at once, keyed by attemptId — used by
 * the teacher student-profile VM so N attempt rows cost one query, not N.
 */
export async function getIntegrityEventsByAttempt(
  attemptIds: readonly string[]
): Promise<Map<string, Array<{ eventType: string; durationMs: number | null }>>> {
  const byAttempt = new Map<
    string,
    Array<{ eventType: string; durationMs: number | null }>
  >()
  if (attemptIds.length === 0) return byAttempt

  const rows = await prisma.attemptIntegrityEvent.findMany({
    where: { attemptId: { in: [...attemptIds] } },
    select: { attemptId: true, eventType: true, durationMs: true },
  })

  for (const r of rows) {
    const list = byAttempt.get(r.attemptId)
    const entry = { eventType: r.eventType, durationMs: r.durationMs }
    if (list) list.push(entry)
    else byAttempt.set(r.attemptId, [entry])
  }

  return byAttempt
}
