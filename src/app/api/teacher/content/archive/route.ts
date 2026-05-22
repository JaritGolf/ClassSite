import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { archiveContent } from '@/lib/content-approval'
import { assertNotSubMode, SubModeError } from '@/lib/substitute-mode'
import type { ApprovableEntity } from '@/lib/content-approval'

export async function POST(req: Request) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])

  try {
    await assertNotSubMode()
    const body = await req.json() as { entityType: ApprovableEntity; entityId: string; reason: string }
    const result = await archiveContent(session.user.userId, body.entityType, body.entityId, body.reason)
    return NextResponse.json(result)
  } catch (e: unknown) {
    if (e instanceof SubModeError) {
      return NextResponse.json({ error: e.code }, { status: 403 })
    }
    throw e
  }
}
