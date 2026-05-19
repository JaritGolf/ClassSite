import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { recordActivity } from '@/lib/streak'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const student = await prisma.student.findUnique({
    where: { userId: session.user.userId },
    select: { id: true },
  })
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const streak = await recordActivity(student.id, new Date())
  return NextResponse.json({
    currentLength: streak.currentLength,
    longestLength: streak.longestLength,
    freezeTokens: streak.freezeTokens,
    lastActiveDate: streak.lastActiveDate,
  })
}
