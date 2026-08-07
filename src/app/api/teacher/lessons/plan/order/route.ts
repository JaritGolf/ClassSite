/**
 * PUT /api/teacher/lessons/plan/order
 *
 * Rewrite the module order for one or more of the caller's classes (ADR 0023).
 * Built-in LessonStep.sequenceOrder is never touched — the order is a
 * per-class fact stored in ClassLessonOutline.
 *
 * assertNotSubMode() is called explicitly — middleware does not cover /api.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { assertNotSubMode } from '@/lib/substitute-mode'
import { reorderClassPlan } from '@/lib/lesson-editor'
import { classAuthoringErrorResponse } from '@/lib/lesson-editor/route-errors'

const BodySchema = z.object({
  classIds: z.array(z.string().min(1)).min(1),
  lessonId: z.string().min(1),
  // Must be exactly the class's current module set — no adds, drops or
  // duplicates hiding inside a reorder. A mismatch returns 409
  // PLAN_OUT_OF_DATE, not 422: it means the plan moved under the teacher.
  orderedItemIds: z.array(z.string().min(1)).min(1),
})

export async function PUT(req: Request) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])

  try {
    await assertNotSubMode()
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_BODY' }, { status: 422 })
    }
    await reorderClassPlan(session.user.userId, parsed.data)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return classAuthoringErrorResponse(e)
  }
}
