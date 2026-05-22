/**
 * EOC readiness trend for the teacher's classes (last 90 days).
 */

import { prisma } from '@/lib/db'
import { getTeacherRoster } from '@/lib/teacher-roster'

export interface EocTrendPoint {
  date: Date
  readinessPercent: number
}

export async function getEocReadinessTrend(
  teacherUserId: string
): Promise<EocTrendPoint[]> {
  const roster = await getTeacherRoster(teacherUserId)
  if (roster.classes.length === 0) return []

  const classIds = roster.classes.map((c) => c.id)
  const since = new Date(Date.now() - 90 * 86400000)

  const snapshots = await prisma.classReadinessSnapshot.findMany({
    where: {
      classId: { in: classIds },
      createdAt: { gte: since },
    },
    select: {
      createdAt: true,
      readinessScore: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  if (snapshots.length === 0) return []

  // Average by day
  const byDay = new Map<string, { total: number; count: number }>()
  for (const snap of snapshots) {
    const dayKey = snap.createdAt.toISOString().slice(0, 10)
    const entry = byDay.get(dayKey) ?? { total: 0, count: 0 }
    entry.total += snap.readinessScore
    entry.count++
    byDay.set(dayKey, entry)
  }

  return Array.from(byDay.entries()).map(([dayKey, agg]) => ({
    date: new Date(dayKey),
    readinessPercent: Math.round((agg.total / agg.count) * 100),
  }))
}
