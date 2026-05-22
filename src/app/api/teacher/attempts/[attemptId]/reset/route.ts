import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { resetAttempt, ResetError } from '@/lib/assessment-reset'
import { assertNotSubMode, SubModeError } from '@/lib/substitute-mode'

export async function POST(
  req: Request,
  { params }: { params: { attemptId: string } }
) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])

  try {
    await assertNotSubMode()
    const body = await req.json() as { reason: string }
    const result = await resetAttempt(session.user.userId, params.attemptId, body.reason)
    return NextResponse.json(result)
  } catch (e: unknown) {
    if (e instanceof SubModeError) {
      return NextResponse.json({ error: e.code }, { status: 403 })
    }
    if (e instanceof ResetError) {
      const status = e.code === 'NOT_FOUND' ? 404 : e.code === 'FORBIDDEN' ? 403 : 409
      return NextResponse.json({ error: e.code }, { status })
    }
    throw e
  }
}
