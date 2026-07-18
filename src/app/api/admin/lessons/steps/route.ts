/**
 * POST /api/admin/lessons/steps
 *
 * Admin-only: add a new step to a lesson. Content is validated up front (see
 * addLessonStep) — a step is only ever created with content that already
 * passes its own schema, never a blank half-written row.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import {
  addLessonStep,
  LessonStructureError,
  LessonEditorValidationError,
  YoutubeVerificationError,
} from '@/lib/lesson-editor'

const BodySchema = z.object({
  lessonId: z.string().min(1),
  stepType: z.string().min(1),
  title: z.string().min(1),
  payload: z.unknown(),
  required: z.boolean().optional(),
  position: z.union([z.string().min(1), z.literal('end')]).optional(),
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
    const result = await addLessonStep(session.user.userId, parsed.data)
    return NextResponse.json(result)
  } catch (e: unknown) {
    if (e instanceof LessonEditorValidationError) {
      return NextResponse.json({ error: 'INVALID_CONTENT', issues: e.issues }, { status: 422 })
    }
    if (e instanceof YoutubeVerificationError) {
      return NextResponse.json({ error: e.code, field: 'youtubeId' }, { status: 422 })
    }
    if (e instanceof LessonStructureError) {
      return NextResponse.json({ error: e.code }, { status: e.code === 'NOT_FOUND' ? 404 : 422 })
    }
    throw e
  }
}
