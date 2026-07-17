import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { assertNotSubMode, SubModeError } from '@/lib/substitute-mode'
import { RosterError } from '@/lib/teacher-roster'
import {
  setGlobalStepEnabled,
  setClassStepVisibility,
  LessonMediaError,
} from '@/lib/lesson-media'

const BodySchema = z.discriminatedUnion('scope', [
  z.object({
    scope: z.literal('global'),
    lessonStepId: z.string().min(1),
    enabled: z.boolean(),
  }),
  z.object({
    scope: z.literal('class'),
    classId: z.string().min(1),
    lessonStepId: z.string().min(1),
    state: z.enum(['inherit', 'show', 'hide']),
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
    const result =
      body.scope === 'global'
        ? await setGlobalStepEnabled(session.user.userId, body.lessonStepId, body.enabled)
        : await setClassStepVisibility(
            session.user.userId,
            body.classId,
            body.lessonStepId,
            body.state
          )
    return NextResponse.json(result)
  } catch (e: unknown) {
    if (e instanceof SubModeError) {
      return NextResponse.json({ error: e.code }, { status: 403 })
    }
    if (e instanceof RosterError) {
      return NextResponse.json({ error: e.code }, { status: e.code === 'FORBIDDEN' ? 403 : 404 })
    }
    if (e instanceof LessonMediaError) {
      return NextResponse.json(
        { error: e.code },
        { status: e.code === 'NOT_FOUND' ? 404 : 422 }
      )
    }
    throw e
  }
}
