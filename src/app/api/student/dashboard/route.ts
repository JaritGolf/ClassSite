import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getOrCreateStreak, recordActivity } from '@/lib/streak'
import { touchActivitySafe } from '@/lib/activity-sessions'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const student = await prisma.student.findUnique({
    where: { userId: session.user.userId },
    select: { id: true },
  })
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const [
    currentMission,
    drillCount,
    recentBadges,
    streakState,
    masteredCount,
    totalCount,
  ] = await Promise.all([
    // First IN_PROGRESS benchmark, fallback to first NOT_STARTED
    prisma.studentProgress.findFirst({
      where: { studentId: student.id, status: 'IN_PROGRESS' },
      include: { benchmark: { select: { code: true, title: true } } },
      orderBy: { benchmark: { sequenceOrder: 'asc' } },
    }).then(async (row) => {
      if (row) return row
      return prisma.studentProgress.findFirst({
        where: { studentId: student.id, status: 'NOT_STARTED' },
        include: { benchmark: { select: { code: true, title: true } } },
        orderBy: { benchmark: { sequenceOrder: 'asc' } },
      })
    }),
    // Count due drill items (dueAt <= now)
    prisma.spacedReviewState.count({
      where: { studentId: student.id, dueAt: { lte: new Date() } },
    }),
    // Most recent 3 badges
    prisma.studentBadge.findMany({
      where: { studentId: student.id },
      orderBy: { awardedAt: 'desc' },
      take: 3,
      include: { badge: { select: { name: true, iconKey: true, description: true } } },
    }),
    // Record activity and return streak
    recordActivity(student.id, new Date()),
    // Mastered benchmark count
    prisma.studentProgress.count({ where: { studentId: student.id, status: 'MASTERED' } }),
    // Total benchmark count
    prisma.benchmark.count(),
  ])

  await touchActivitySafe(student.id, { area: 'dashboard' })

  const pct = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0
  const readinessMeter = { pct, ciLow: Math.max(0, pct - 5), ciHigh: Math.min(100, pct + 5) }

  return NextResponse.json({
    currentMission: currentMission
      ? { benchmarkCode: currentMission.benchmark.code, title: currentMission.benchmark.title, status: currentMission.status }
      : null,
    drillCount,
    recentBadges: recentBadges.map((sb) => ({
      id: sb.id,
      awardedAt: sb.awardedAt,
      name: sb.badge.name,
      iconKey: sb.badge.iconKey,
      description: sb.badge.description,
    })),
    streakState: {
      currentLength: streakState.currentLength,
      longestLength: streakState.longestLength,
      freezeTokens: streakState.freezeTokens,
    },
    readinessMeter,
  })
}
