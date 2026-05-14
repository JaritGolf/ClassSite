/**
 * GET /api/source-decoder/progress
 *
 * Returns the student's Source Decoder progress across all 4 levels,
 * plus the full mission definitions.
 *
 * Access: STUDENT only.
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getSourceDecoderProgress, getSourceDecoderMissions } from '@/lib/reading-load'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'STUDENT') {
    return NextResponse.json(
      { error: 'Forbidden: students only' },
      { status: 403 }
    )
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.user.userId },
    select: { id: true },
  })
  if (!student) {
    return NextResponse.json(
      { error: 'Student profile not found' },
      { status: 404 }
    )
  }

  const [{ progress, highestCompletedLevel }, missions] = await Promise.all([
    getSourceDecoderProgress(student.id),
    Promise.resolve(getSourceDecoderMissions()),
  ])

  return NextResponse.json({
    progress,
    highestCompletedLevel,
    missions,
  })
}
