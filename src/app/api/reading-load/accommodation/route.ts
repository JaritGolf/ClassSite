/**
 * GET  /api/reading-load/accommodation
 * POST /api/reading-load/accommodation
 *
 * GET:
 *   STUDENT  → returns their own accommodations + effective reading level
 *   TEACHER/ADMIN → requires ?studentId=<cuid> query param
 *
 * POST (TEACHER/ADMIN only):
 *   Body: { studentId, accommodationCode, active? }
 *   Sets or revokes an accommodation on a student profile.
 *
 * Access: STUDENT for GET (own data); TEACHER/ADMIN for GET (others) + POST.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  getStudentAccommodations,
  getEffectiveReadingLevel,
  setAccommodation,
  AccommodationError,
} from '@/lib/reading-load'

// ── GET ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let studentId: string

  if (session.user.role === 'STUDENT') {
    // Resolve their own Student record
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
    studentId = student.id
  } else if (
    session.user.role === 'TEACHER' ||
    session.user.role === 'ADMIN'
  ) {
    const qStudentId = req.nextUrl.searchParams.get('studentId')
    if (!qStudentId) {
      return NextResponse.json(
        { error: 'Query param studentId is required for TEACHER/ADMIN' },
        { status: 400 }
      )
    }
    studentId = qStudentId
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [accommodations, effectiveLevel] = await Promise.all([
    getStudentAccommodations(studentId),
    getEffectiveReadingLevel(studentId),
  ])

  return NextResponse.json({
    accommodations,
    effectiveLevel: effectiveLevel.effectiveLevel,
    accommodationApplied: effectiveLevel.accommodationApplied,
    activeCodes: effectiveLevel.codes,
  })
}

// ── POST ───────────────────────────────────────────────────────────────────

const SetAccommodationSchema = z.object({
  studentId: z.string().cuid(),
  accommodationCode: z.string().min(1).max(100),
  active: z.boolean().default(true),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden: teachers and admins only' },
      { status: 403 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = SetAccommodationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const result = await setAccommodation(
      session.user.userId,
      parsed.data.studentId,
      parsed.data.accommodationCode,
      parsed.data.active
    )
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof AccommodationError) {
      const statusMap = {
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        INVALID_CODE: 400,
      } as const
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: statusMap[err.code] }
      )
    }
    console.error('[reading-load/accommodation]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
