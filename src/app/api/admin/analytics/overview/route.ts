/**
 * GET /api/admin/analytics/overview
 *
 * Cross-class EOC analytics overview for admins.
 * Returns aggregate readiness, student count, and class count.
 *
 * Access: ADMIN only.
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { computeClassReadiness } from '@/lib/eoc-analytics'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  // Load all classes
  const classes = await prisma.class.findMany({
    select: { id: true, name: true, schoolYear: true },
    orderBy: { schoolYear: 'desc' },
  })

  const studentCount = await prisma.student.count()

  // Compute readiness for each class (parallel, capped to avoid timeouts)
  const classReadiness = await Promise.all(
    classes.slice(0, 20).map(async (cls) => {
      const readiness = await computeClassReadiness(cls.id)
      return {
        classId: cls.id,
        name: cls.name,
        schoolYear: cls.schoolYear,
        overallPercent: Math.round(readiness.overallPercent * 10) / 10,
        studentCount: readiness.studentCount,
      }
    })
  )

  const avgReadiness =
    classReadiness.length === 0
      ? 0
      : classReadiness.reduce((sum, c) => sum + c.overallPercent, 0) / classReadiness.length

  return NextResponse.json({
    classCount: classes.length,
    studentCount,
    avgReadinessPercent: Math.round(avgReadiness * 10) / 10,
    classes: classReadiness,
  })
}
