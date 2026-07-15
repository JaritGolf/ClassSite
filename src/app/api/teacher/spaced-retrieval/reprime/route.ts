/**
 * Teacher: Re-prime a class's spaced review.
 *
 * Halves SM-2 intervals and pulls dueAt forward for the class's
 * SpacedReviewState rows (optionally scoped to one benchmark), so decaying
 * material resurfaces in the Daily Republic Drill sooner. Writes a
 * TRIGGER_CLASS_REPRIMING audit log.
 *
 * Access: TEACHER/ADMIN, roster-scoped to a class the teacher owns.
 * Blocked in substitute mode.
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { assertNotSubMode, SubModeError } from '@/lib/substitute-mode'
import { reprimeClass, ReprimeError } from '@/lib/spaced-retrieval'

export async function POST(req: Request) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])

  try {
    await assertNotSubMode()

    const body = (await req.json().catch(() => ({}))) as {
      classId?: string
      benchmarkId?: string
    }
    if (!body.classId) {
      return NextResponse.json({ error: 'classId is required' }, { status: 400 })
    }

    const result = await reprimeClass(
      session.user.userId,
      body.classId,
      body.benchmarkId || undefined
    )
    return NextResponse.json({ ok: true, ...result })
  } catch (e: unknown) {
    if (e instanceof SubModeError) {
      return NextResponse.json({ error: e.code }, { status: 403 })
    }
    if (e instanceof ReprimeError) {
      return NextResponse.json(
        { error: e.code },
        { status: e.code === 'NOT_FOUND' ? 404 : 403 }
      )
    }
    throw e
  }
}
