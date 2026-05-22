import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { bulkApproveByTag } from '@/lib/content-approval'
import { assertNotSubMode, SubModeError } from '@/lib/substitute-mode'
import type { BulkApproveCriteria } from '@/lib/content-approval'

export async function POST(req: Request) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])

  try {
    await assertNotSubMode()
    const body = await req.json() as BulkApproveCriteria
    const result = await bulkApproveByTag(session.user.userId, body)
    return NextResponse.json(result)
  } catch (e: unknown) {
    if (e instanceof SubModeError) {
      return NextResponse.json({ error: e.code }, { status: 403 })
    }
    throw e
  }
}
