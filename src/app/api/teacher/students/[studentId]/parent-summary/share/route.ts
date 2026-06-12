import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { shareParentSummary } from '@/lib/parent-summary'
import { RosterError } from '@/lib/teacher-roster'

export async function POST(
  req: Request,
  { params }: { params: { studentId: string } }
) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])

  try {
    const body = (await req.json().catch(() => ({}))) as { fieldsIncluded?: string[] }
    const fields = Array.isArray(body.fieldsIncluded) ? body.fieldsIncluded : []
    const result = await shareParentSummary(session.user.userId, params.studentId, fields)
    return NextResponse.json(result)
  } catch (e: unknown) {
    if (e instanceof RosterError) {
      const status = e.code === 'NOT_FOUND' ? 404 : 403
      return NextResponse.json({ error: e.code }, { status })
    }
    throw e
  }
}
