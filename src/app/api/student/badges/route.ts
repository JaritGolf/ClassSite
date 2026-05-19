import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const student = await prisma.student.findUnique({
    where: { userId: session.user.userId },
    select: { id: true },
  })
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const [earnedBadges, allBadges] = await Promise.all([
    prisma.studentBadge.findMany({
      where: { studentId: student.id },
      include: { badge: true },
      orderBy: { awardedAt: 'desc' },
    }),
    prisma.badge.findMany({ orderBy: [{ track: 'asc' }, { name: 'asc' }] }),
  ])

  const earnedIds = new Set(earnedBadges.map((sb) => sb.badgeId))

  return NextResponse.json({
    earned: earnedBadges.map((sb) => ({
      id: sb.id,
      awardedAt: sb.awardedAt,
      badge: sb.badge,
    })),
    all: allBadges.map((b) => ({
      ...b,
      earned: earnedIds.has(b.id),
    })),
  })
}
