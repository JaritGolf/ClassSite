/**
 * POST /api/admin/lessons/steps/reorder
 *
 * Admin-only: reorder a lesson's steps to exactly `orderedStepIds`. Rejects
 * unless the id set matches the lesson's current steps exactly.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { reorderLessonSteps, LessonStructureError } from '@/lib/lesson-editor'

const BodySchema = z.object({
  lessonId: z.string().min(1),
  orderedStepIds: z.array(z.string().min(1)).min(1),
})

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  const parsed = BodySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 422 })
  }

  try {
    await reorderLessonSteps(session.user.userId, parsed.data.lessonId, parsed.data.orderedStepIds)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    if (e instanceof LessonStructureError) {
      return NextResponse.json({ error: e.code }, { status: 422 })
    }
    throw e
  }
}
