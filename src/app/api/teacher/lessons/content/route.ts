/**
 * POST /api/teacher/lessons/content
 *
 * Class-scoped content override — teacher (their own classes only, roster-
 * guarded) or admin. `classIds` may name one or several of the caller's
 * classes to apply the same edit to at once. Set `clear: true` to reset
 * those classes back to the global default. Mirrors
 * /api/teacher/lessons/visibility's auth pattern exactly (requireAuth +
 * assertNotSubMode + RosterError mapping).
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { assertNotSubMode, SubModeError } from '@/lib/substitute-mode'
import { RosterError } from '@/lib/teacher-roster'
import {
  setClassContentOverride,
  LessonEditorError,
  LessonEditorInputError,
  LessonEditorValidationError,
  YoutubeVerificationError,
} from '@/lib/lesson-editor'

const BodySchema = z.union([
  z.object({
    classIds: z.array(z.string().min(1)).min(1),
    lessonStepId: z.string().min(1),
    clear: z.literal(true),
  }),
  z.object({
    classIds: z.array(z.string().min(1)).min(1),
    lessonStepId: z.string().min(1),
    stepType: z.string().min(1),
    title: z.string().min(1).optional(),
    payload: z.unknown(),
  }),
])

export async function POST(req: Request) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])

  try {
    await assertNotSubMode()
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_BODY' }, { status: 422 })
    }
    const body = parsed.data
    const input = 'clear' in body ? { clear: true as const } : body
    await setClassContentOverride(session.user.userId, body.classIds, body.lessonStepId, input)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    if (e instanceof SubModeError) {
      return NextResponse.json({ error: e.code }, { status: 403 })
    }
    if (e instanceof RosterError) {
      return NextResponse.json({ error: e.code }, { status: e.code === 'FORBIDDEN' ? 403 : 404 })
    }
    if (e instanceof LessonEditorValidationError) {
      return NextResponse.json({ error: 'INVALID_CONTENT', issues: e.issues }, { status: 422 })
    }
    if (e instanceof YoutubeVerificationError) {
      return NextResponse.json({ error: e.code, field: 'youtubeId' }, { status: 422 })
    }
    if (e instanceof LessonEditorInputError) {
      return NextResponse.json({ error: 'NO_CLASSES_SELECTED' }, { status: 422 })
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
