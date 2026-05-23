/**
 * GET /api/admin/calibration/runs?schoolYear=<>
 *
 * List all calibration runs, optionally filtered by school year.
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
  const schoolYear = searchParams.get('schoolYear')

  const runs = await prisma.eocCalibrationRun.findMany({
    where: schoolYear ? { schoolYear } : undefined,
    orderBy: { runAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ runs, count: runs.length })
}
