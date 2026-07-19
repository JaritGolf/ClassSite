/**
 * PATCH/DELETE /api/admin/lessons/steps/[lessonStepId]
 *
 * Admin-only global lesson content editing. Uses getSession() + a manual
 * role check (JSON 403 on mismatch) rather than requireAuth's redirect
 * behavior — this is a security boundary that should fail loudly and
 * testably, matching /api/admin/audit/export's convention. This is a
 * deliberate tightening vs. the existing visibility toggle (any teacher can
 * flip that global kill-switch) — content rewriting is higher-stakes.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import {
  editGlobalStepContent,
  LessonEditorError,
  LessonEditorValidationError,
} from '@/lib/lesson-editor'
import { removeLessonStep, LessonStructureError } from '@/lib/lesson-editor'
import { YoutubeVerificationError } from '@/lib/lesson-editor'

const BodySchema = z.object({
  stepType: z.string().min(1),
  title: z.string().min(1).optional(),
  payload: z.unknown(),
})

async function requireAdmin() {
  const session = await getSession()
  if (!session) return { error: NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 }) }
  if (session.user.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }) }
  }
  return { session }
}

export async function PATCH(
  req: Request,
  { params }: { params: { lessonStepId: string } }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const parsed = BodySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 422 })
  }

  try {
    const result = await editGlobalStepContent(
      auth.session.user.userId,
      params.lessonStepId,
      parsed.data
    )
    return NextResponse.json(result)
  } catch (e: unknown) {
    if (e instanceof LessonEditorValidationError) {
      return NextResponse.json({ error: 'INVALID_CONTENT', issues: e.issues }, { status: 422 })
    }
    if (e instanceof YoutubeVerificationError) {
      return NextResponse.json({ error: e.code, field: 'youtubeId' }, { status: 422 })
    }
    if (e instanceof LessonEditorError) {
      return NextResponse.json(
        { error: e.code },
        { status: e.code === 'NOT_FOUND' ? 404 : 409 }
      )
    }
    throw e
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { lessonStepId: string } }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    const result = await removeLessonStep(auth.session.user.userId, params.lessonStepId)
    return NextResponse.json(result)
  } catch (e: unknown) {
    if (e instanceof LessonStructureError) {
      return NextResponse.json({ error: e.code }, { status: e.code === 'NOT_FOUND' ? 404 : 422 })
    }
    throw e
  }
}
