/**
 * POST /api/mission/progress
 *
 * Persists the student's position inside a mission's Guided Training so they
 * can resume where they left off across devices/sessions (spec §21.3 "clear
 * button to continue from last saved step"). Writes the long-dormant
 * StudentProgress.currentStepId FK.
 *
 * Body: { benchmarkCode: string, stepId: string | null }
 * Access: STUDENT only; writes only the student's own row. Display/resume
 * convenience only — no grading or mastery impact.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { canOpenMission } from '@/lib/mastery'
import { recordLastActivity } from '@/lib/student-activity'
import { fromClassStepViewId, isClassStepViewId } from '@/lib/lesson-content'

const BodySchema = z.object({
  benchmarkCode: z.string().min(1).max(32),
  // NOTE the `.cuid()` branch is dead — the second alternative accepts any
  // string of 1..64 chars, so it matches first for anything shaped like an id.
  // Left as-is rather than tightened: `cstep:<25-char cuid>` is 31 chars and
  // already passes, and narrowing this is a behaviour change to a hot path
  // that buys nothing the ownership lookups below don't already enforce.
  stepId: z.string().cuid().nullable().or(z.string().min(1).max(64).nullable()),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden: students only' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.user.userId },
    select: { id: true },
  })
  if (!student) {
    return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })
  }

  const benchmark = await prisma.benchmark.findUnique({
    where: { code: parsed.data.benchmarkCode },
    select: { id: true },
  })
  if (!benchmark) {
    return NextResponse.json({ error: 'Benchmark not found' }, { status: 404 })
  }

  // Validate the step belongs to one of this benchmark's lessons (guards the FK
  // and prevents pointing progress at another benchmark's content).
  //
  // `undefined` means "leave whatever pointer is already there alone", which is
  // distinct from `null` ("clear it").
  let currentStepId: string | null | undefined = null
  if (parsed.data.stepId) {
    if (isClassStepViewId(parsed.data.stepId)) {
      // A teacher-added module (ADR 0023). It can never be written to this FK,
      // which targets LessonStep.
      //
      // The current client resolves the nearest preceding built-in step before
      // calling, so this branch is only reachable from a client left over from
      // before that shipped. It must NOT 404: the early return would skip the
      // upsert below, and a student whose first training module is
      // teacher-added would end up with no StudentProgress row at all — no
      // IN_PROGRESS status and no recordLastActivity, so their dashboard would
      // stop offering to resume. The client's .catch(() => {}) would hide it
      // completely. So verify ownership, keep the existing pointer, and let the
      // rest of the request proceed.
      const classStep = await prisma.classLessonStep.findFirst({
        where: {
          id: fromClassStepViewId(parsed.data.stepId),
          lesson: { benchmarkId: benchmark.id },
        },
        select: { id: true },
      })
      if (!classStep) {
        return NextResponse.json({ error: 'Step not found for this benchmark' }, { status: 404 })
      }
      currentStepId = undefined
    } else {
      const step = await prisma.lessonStep.findFirst({
        where: { id: parsed.data.stepId, lesson: { benchmarkId: benchmark.id } },
        select: { id: true },
      })
      if (!step) {
        return NextResponse.json({ error: 'Step not found for this benchmark' }, { status: 404 })
      }
      currentStepId = step.id
    }
  }

  // Permission is checked ONLY when this write would CREATE the row.
  //
  // Two reasons it is not checked every time. First, cost: this endpoint fires on
  // every training step (~17 per mission, no debounce), and it is the hottest
  // student write path — re-deriving availability on each ping would roughly
  // double its query load for no added safety, since a row can only exist if a
  // create was allowed. Second, correctness: an existing row means the student is
  // already in this mission, and revoking mid-session (say a teacher toggles the
  // ready flag) should not start rejecting their resume bookmark.
  //
  // The create branch is the one that matters. It writes IN_PROGRESS, and before
  // this gate existed any student could manufacture that row for ANY benchmark
  // just by typing the mission URL — which is what made "a row exists" unusable
  // as a definition of access. See src/lib/mastery/availability.ts.
  const existing = await prisma.studentProgress.findUnique({
    where: { studentId_benchmarkId: { studentId: student.id, benchmarkId: benchmark.id } },
    select: { id: true },
  })

  if (!existing) {
    const allowed = await canOpenMission(student.id, benchmark.id)
    if (!allowed) {
      return NextResponse.json(
        { error: 'This mission is not open yet' },
        { status: 403 }
      )
    }
  }

  // Still an upsert, not an update. Between the read above and this write the row
  // may appear (two tabs, a retried beacon), and an update would then throw P2025
  // — a 500 on a brand-new student's very first training click.
  await prisma.studentProgress.upsert({
    where: { studentId_benchmarkId: { studentId: student.id, benchmarkId: benchmark.id } },
    create: {
      studentId: student.id,
      benchmarkId: benchmark.id,
      status: 'IN_PROGRESS',
      currentStepId: currentStepId ?? null,
    },
    // `{}` when the reported step was a teacher module: the row is still
    // created/touched and the activity below still records, but the existing
    // cross-device pointer is left as it was rather than cleared.
    update: currentStepId === undefined ? {} : { currentStepId },
  })

  // Dashboard "pick up where you left off" — non-fatal, display-only.
  try {
    await recordLastActivity(student.id, 'MISSION_TRAINING', benchmark.id)
  } catch (err) {
    console.error('[student-activity]', err instanceof Error ? err.message : err)
  }

  return NextResponse.json({ ok: true })
}
