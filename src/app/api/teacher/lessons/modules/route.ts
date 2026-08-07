/**
 * POST /api/teacher/lessons/modules
 *
 * Add a teacher-authored module to one or more of the caller's own classes
 * (ADR 0023). Built-in content is never touched.
 *
 * NOTE the explicit assertNotSubMode() below. src/middleware.ts's matcher
 * covers /student, /teacher, /parent and /admin — NOT /api — so the
 * substitute-mode write gate does not apply to API routes automatically. Every
 * mutating route has to call it itself.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { assertNotSubMode } from '@/lib/substitute-mode'
import { addClassModule, TEACHER_ADDABLE_STEP_TYPES } from '@/lib/lesson-editor'
import { classAuthoringErrorResponse } from '@/lib/lesson-editor/route-errors'

const BodySchema = z.object({
  classIds: z.array(z.string().min(1)).min(1),
  lessonId: z.string().min(1),
  stepType: z.enum(TEACHER_ADDABLE_STEP_TYPES),
  title: z.string().min(1).max(200),
  payload: z.unknown().optional(),
  placement: z.union([
    z.object({ position: z.literal('start') }),
    z.object({ position: z.literal('after'), itemId: z.string().min(1) }),
  ]),
})

export async function POST(req: Request) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])

  try {
    await assertNotSubMode()
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_BODY' }, { status: 422 })
    }
    const result = await addClassModule(session.user.userId, parsed.data)
    return NextResponse.json({ ok: true, ...result })
  } catch (e: unknown) {
    return classAuthoringErrorResponse(e)
  }
}
