/**
 * GET /api/admin/eoc-scores?schoolYear=<>
 *
 * List EOC actual scores for a given school year.
 *
 * Access: ADMIN only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const schoolYear = searchParams.get('schoolYear') ?? ''

  const scores = await prisma.eocActualScore.findMany({
    where: schoolYear ? { schoolYear } : undefined,
    select: {
      id: true,
      studentId: true,
      schoolYear: true,
      scaledScore: true,
      achievementLevel: true,
      enteredAt: true,
      consentAcknowledged: true,
      student: {
        select: {
          user: { select: { email: true, firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { enteredAt: 'desc' },
    take: 500,
  })

  return NextResponse.json({ scores, count: scores.length })
}
