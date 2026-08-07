/**
 * POST /api/teacher/lessons/plan/order/reset
 *
 * Drop a class's saved module order so the lesson returns to the curriculum's
 * own sequence (ADR 0023).
 *
 * Modules the teacher ADDED are not deleted — reconciliation re-splices them
 * at their anchors — which is what lets the confirmation dialog promise
 * "modules you added stay where they are".
 *
 * assertNotSubMode() is called explicitly — middleware does not cover /api.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { assertNotSubMode } from '@/lib/substitute-mode'
import { resetClassPlanOrder } from '@/lib/lesson-editor'
import { classAuthoringErrorResponse } from '@/lib/lesson-editor/route-errors'

const BodySchema = z.object({
  classIds: z.array(z.string().min(1)).min(1),
  lessonId: z.string().min(1),
})

export async function POST(req: Request) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])

  try {
    await assertNotSubMode()
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_BODY' }, { status: 422 })
    }
    const result = await resetClassPlanOrder(
      session.user.userId,
      parsed.data.classIds,
      parsed.data.lessonId
    )
    return NextResponse.json({ ok: true, ...result })
  } catch (e: unknown) {
    return classAuthoringErrorResponse(e)
  }
}
