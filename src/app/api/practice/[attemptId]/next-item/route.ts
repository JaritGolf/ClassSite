/**
 * GET /api/practice/[attemptId]/next-item
 *
 * Returns the next item for an adaptive practice session.
 * May return a regular question, a worked example, or a near-transfer question
 * depending on the student's current streak state.
 *
 * Access: STUDENT only (ownership verified inside getNextItem).
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getNextItem } from '@/lib/adaptive-difficulty'

interface RouteParams {
  params: { attemptId: string }
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden: students only' }, { status: 403 })
  }

  // Resolve Student.id
  const student = await prisma.student.findUnique({
    where: { userId: session.user.userId },
    select: { id: true },
  })
  if (!student) {
    return NextResponse.json(
      { error: 'Student profile not found for this user' },
      { status: 404 }
    )
  }

  try {
    const payload = await getNextItem(params.attemptId, student.id)
    return NextResponse.json(payload)
  } catch (err) {
    console.error('[practice/next-item]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
