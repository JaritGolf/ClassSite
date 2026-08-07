/**
 * PATCH  /api/teacher/lessons/modules/[classLessonStepId] — edit or show/hide
 * DELETE /api/teacher/lessons/modules/[classLessonStepId] — delete
 *
 * Both operate on a module the caller authored for their own class (ADR 0023),
 * and both default to applying across the sibling rows created by the same
 * "add to all my classes" action.
 *
 * assertNotSubMode() is called explicitly — middleware does not cover /api.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { assertNotSubMode } from '@/lib/substitute-mode'
import { deleteClassModule, editClassModule, setClassModuleVisibility } from '@/lib/lesson-editor'
import { classAuthoringErrorResponse } from '@/lib/lesson-editor/route-errors'

/**
 * Two shapes on one verb: a content edit, or a visibility flip. Discriminated
 * so a visibility toggle never has to round-trip the whole payload (and can't
 * accidentally blank it by omitting one).
 */
const BodySchema = z.union([
  z.object({
    op: z.literal('edit'),
    stepType: z.string().min(1),
    title: z.string().min(1).max(200).optional(),
    payload: z.unknown().optional(),
    applyToSiblings: z.boolean().optional(),
  }),
  z.object({
    op: z.literal('visibility'),
    visible: z.boolean(),
    applyToSiblings: z.boolean().optional(),
  }),
])

interface RouteParams {
  params: { classLessonStepId: string }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])

  try {
    await assertNotSubMode()
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_BODY' }, { status: 422 })
    }
    const body = parsed.data
    const result =
      body.op === 'edit'
        ? await editClassModule(session.user.userId, params.classLessonStepId, body)
        : await setClassModuleVisibility(
            session.user.userId,
            params.classLessonStepId,
            body.visible,
            { applyToSiblings: body.applyToSiblings }
          )
    return NextResponse.json({ ok: true, ...result })
  } catch (e: unknown) {
    return classAuthoringErrorResponse(e)
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])

  try {
    await assertNotSubMode()
    // ?scope=one deletes only the addressed class's copy; the default 'all'
    // removes it everywhere it was added together.
    const scope = new URL(req.url).searchParams.get('scope')
    const result = await deleteClassModule(session.user.userId, params.classLessonStepId, {
      applyToSiblings: scope !== 'one',
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (e: unknown) {
    return classAuthoringErrorResponse(e)
  }
}
