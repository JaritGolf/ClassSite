/**
 * GET /api/admin/analytics/readiness?classId=<id>
 * GET /api/admin/analytics/readiness?studentId=<id>
 *
 * Returns EOC readiness for a class or a student.
 *
 * Access: ADMIN only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { computeClassReadiness, computeStudentReadiness } from '@/lib/eoc-analytics'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const classId = searchParams.get('classId')
  const studentId = searchParams.get('studentId')

  if (classId) {
    const readiness = await computeClassReadiness(classId)
    return NextResponse.json(readiness)
  }

  if (studentId) {
    const readiness = await computeStudentReadiness(studentId)
    return NextResponse.json(readiness)
  }

  return NextResponse.json({ error: 'INVALID_INPUT', message: 'classId or studentId required' }, { status: 400 })
}
