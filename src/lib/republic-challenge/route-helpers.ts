/**
 * Republic Challenge route helpers.
 *
 * Shared session+student resolution for the seven /api/republic-challenge/*
 * start endpoints. Each route is a thin wrapper over
 * `createRepublicChallengeSession` and these helpers.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { RepublicChallengeError } from './session'

export interface AuthedStudent {
  studentId: string
  userId: string
  /**
   * Class config for the student's first ACTIVE enrolment.
   * Republic Challenge config is per-class today; if a student is enrolled in
   * multiple classes we pick the first ACTIVE class deterministically.
   * Null when the student is not enrolled in any class.
   */
  classConfig: {
    classId: string
    rcSessionLengthOverride: number | null
    rcStaminaOverride: number | null
    rcAttemptsAllowed: number
    rcReviewWindow: string
    featureEocReviewEnabled: boolean
    /** e.g. "2026-2027". Drives the school-year-relative Final Trial gate. */
    schoolYear: string
  } | null
}

/**
 * Resolve the authenticated student and their primary class config.
 *
 * Returns either `{ student }` on success or `{ error }` carrying a JSON
 * NextResponse the caller should return verbatim.
 */
export async function resolveAuthedStudent(): Promise<
  { student: AuthedStudent } | { error: NextResponse }
> {
  const session = await getSession()
  if (!session) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  if (session.user.role !== 'STUDENT') {
    return {
      error: NextResponse.json(
        { error: 'Forbidden: students only' },
        { status: 403 }
      ),
    }
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.user.userId },
    select: {
      id: true,
      classEnrollments: {
        where: { status: 'ACTIVE' },
        select: {
          class: {
            select: {
              id: true,
              rcSessionLengthOverride: true,
              rcStaminaOverride: true,
              rcAttemptsAllowed: true,
              rcReviewWindow: true,
              featureEocReviewEnabled: true,
              schoolYear: true,
            },
          },
        },
        orderBy: { enrolledAt: 'asc' },
        take: 1,
      },
    },
  })

  if (!student) {
    return {
      error: NextResponse.json(
        { error: 'Student profile not found for this user' },
        { status: 404 }
      ),
    }
  }

  const klass = student.classEnrollments[0]?.class ?? null

  return {
    student: {
      studentId: student.id,
      userId: session.user.userId,
      classConfig: klass
        ? {
            classId: klass.id,
            rcSessionLengthOverride: klass.rcSessionLengthOverride,
            rcStaminaOverride: klass.rcStaminaOverride,
            rcAttemptsAllowed: klass.rcAttemptsAllowed,
            rcReviewWindow: klass.rcReviewWindow,
            featureEocReviewEnabled: klass.featureEocReviewEnabled,
            schoolYear: klass.schoolYear,
          }
        : null,
    },
  }
}

/**
 * Map a Republic Challenge error to an HTTP JSON response.
 * Falls through to 500 for unexpected errors.
 */
export function republicChallengeErrorResponse(
  err: unknown,
  context: string
): NextResponse {
  if (err instanceof RepublicChallengeError) {
    const statusMap: Record<RepublicChallengeError['code'], number> = {
      EMPTY_POOL: 422,
      INVALID_MODE: 400,
      FEATURE_DISABLED: 403,
      CATEGORY_NOT_FOUND: 404,
      STIMULUS_TYPE_REQUIRED: 400,
    }
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: statusMap[err.code] ?? 400 }
    )
  }
  console.error(`[${context}]`, err instanceof Error ? err.message : err)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
