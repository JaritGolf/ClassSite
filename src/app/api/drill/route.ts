/**
 * GET /api/drill
 *
 * Returns today's Daily Republic Drill queue for the authenticated student.
 * Items are due (dueAt <= now), capped at 15, and interleaved across benchmarks.
 *
 * Auth: student role required.
 * Spec reference: Section 15.3
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDrillQueue } from '@/lib/spaced-retrieval'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden: students only' }, { status: 403 })
  }

  // Resolve Student.id from session User.id
  const student = await prisma.student.findUnique({
    where: { userId: session.user.userId },
    select: { id: true },
  })

  if (!student) {
    return NextResponse.json({ error: 'Student record not found' }, { status: 404 })
  }

  const items = await getDrillQueue(student.id)

  return NextResponse.json({ items, count: items.length })
}
