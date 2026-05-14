/**
 * Accommodation DB Functions
 *
 * Resolves student accommodation records and computes the effective
 * reading-load level for a given student + context.
 *
 * Spec reference: Section 16.5, Section 31.3
 */

import { prisma } from '@/lib/db'
import { resolveAccommodationLevel, LEVEL_1_ACCOMMODATION_CODES } from './variant-selector'

// ── Error type ─────────────────────────────────────────────────────────────

export class AccommodationError extends Error {
  constructor(
    message: string,
    public readonly code: 'NOT_FOUND' | 'FORBIDDEN' | 'INVALID_CODE'
  ) {
    super(message)
    this.name = 'AccommodationError'
  }
}

// ── Return types ───────────────────────────────────────────────────────────

export interface AccommodationRecord {
  id: string
  code: string
  name: string
  description: string
  active: boolean
  grantedAt: Date
}

export interface EffectiveReadingLevel {
  effectiveLevel: number
  accommodationApplied: boolean
  codes: string[]
}

// ── getStudentAccommodations ───────────────────────────────────────────────

/**
 * Return all accommodation records for a student (active and inactive),
 * ordered by most recently granted.
 */
export async function getStudentAccommodations(
  studentId: string
): Promise<AccommodationRecord[]> {
  const rows = await prisma.studentAccommodation.findMany({
    where: { studentId },
    include: { accommodation: true },
    orderBy: { grantedAt: 'desc' },
  })

  return rows.map((r) => ({
    id: r.id,
    code: r.accommodation.code,
    name: r.accommodation.name,
    description: r.accommodation.description,
    active: r.active,
    grantedAt: r.grantedAt,
  }))
}

// ── getEffectiveReadingLevel ───────────────────────────────────────────────

/**
 * Compute the effective reading-load level for a student, taking active
 * accommodations into account.
 *
 * @param studentId        - The Student.id
 * @param requestedLevel   - The base level to start from (default 2)
 * @param isMasteryChallenge - Whether this is a Mastery Challenge context
 *                            (accommodations never downgrade mastery level)
 */
export async function getEffectiveReadingLevel(
  studentId: string,
  requestedLevel: number = 2,
  isMasteryChallenge: boolean = false
): Promise<EffectiveReadingLevel> {
  const rows = await prisma.studentAccommodation.findMany({
    where: { studentId, active: true },
    include: { accommodation: true },
  })

  const codes = rows.map((r) => r.accommodation.code)
  const effectiveLevel = resolveAccommodationLevel(codes, requestedLevel, isMasteryChallenge)

  return {
    effectiveLevel,
    accommodationApplied: effectiveLevel !== requestedLevel,
    codes,
  }
}

// ── setAccommodation ───────────────────────────────────────────────────────

/**
 * Grant or revoke an accommodation on a student's profile.
 *
 * Only teachers and admins may call this function. The caller's userId
 * is resolved to a Teacher record for permission checking.
 *
 * Note: AuditLog entries for accommodation changes are deferred to Phase 9
 * (teacher LMS). The grantedBy/grantedAt fields provide the essential record.
 */
export async function setAccommodation(
  teacherUserId: string,
  studentId: string,
  accommodationCode: string,
  active: boolean = true
): Promise<{ studentAccommodationId: string; accommodationCode: string; active: boolean }> {
  // Verify caller is a Teacher
  const teacher = await prisma.teacher.findUnique({
    where: { userId: teacherUserId },
    select: { id: true },
  })
  if (!teacher) {
    throw new AccommodationError(
      'Only teachers may set student accommodations',
      'FORBIDDEN'
    )
  }

  // Look up the accommodation by code
  const accommodation = await prisma.accommodation.findUnique({
    where: { code: accommodationCode },
    select: { id: true },
  })
  if (!accommodation) {
    throw new AccommodationError(
      `Accommodation code '${accommodationCode}' not found`,
      'INVALID_CODE'
    )
  }

  // Verify the student exists
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true },
  })
  if (!student) {
    throw new AccommodationError(
      `Student '${studentId}' not found`,
      'NOT_FOUND'
    )
  }

  // Upsert on [studentId, accommodationId]
  const record = await prisma.studentAccommodation.upsert({
    where: {
      studentId_accommodationId: {
        studentId,
        accommodationId: accommodation.id,
      },
    },
    create: {
      studentId,
      accommodationId: accommodation.id,
      grantedBy: teacherUserId,
      active,
    },
    update: {
      active,
      grantedBy: teacherUserId,
      grantedAt: new Date(),
    },
    select: { id: true },
  })

  return {
    studentAccommodationId: record.id,
    accommodationCode,
    active,
  }
}

// Re-export for consumers who need to check codes
export { LEVEL_1_ACCOMMODATION_CODES, resolveAccommodationLevel }
