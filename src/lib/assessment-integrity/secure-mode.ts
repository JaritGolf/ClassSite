/**
 * Focus Mode resolution — is this student, on this assessment, under integrity
 * enforcement right now?
 *
 * Two gates, both must pass:
 *   1. FEATURE_SECURE_ASSESSMENT env flag (master kill switch, off by default)
 *   2. Class.secureAssessmentMode on the student's class (teacher opt-in)
 * ...plus the assessment must be a secure type.
 *
 * The SERVER decides this and tells the client (GET /api/assessment/[id]
 * returns `secureMode`). The client never decides for itself whether it is
 * being watched.
 */

import { prisma } from '@/lib/db'
import { isSecureAssessmentType } from '@/lib/assessment/wire'

/**
 * FEATURE_SECURE_ASSESSMENT flag (spec §29 feature flags).
 * Opt-in (off by default, matching .env.example): set to "true" to enable
 * Focus Mode. Lets integrity enforcement be turned on for a pilot — or off
 * instantly — without a code change.
 */
export function isSecureAssessmentEnabled(): boolean {
  return process.env.FEATURE_SECURE_ASSESSMENT === 'true'
}

/**
 * Read the per-class opt-in for a student.
 *
 * Uses the student's first ACTIVE enrollment, mirroring
 * resolveStrategyRequirements (src/lib/strategy-track/index.ts) — a student in
 * multiple classes resolves against the earliest-enrolled one. A per-class
 * picker for multi-class students is the same deferred item the strategy track
 * already carries.
 */
export async function resolveSecureModeForStudent(studentId: string): Promise<boolean> {
  if (!isSecureAssessmentEnabled()) return false

  const enrollment = await prisma.classEnrollment.findFirst({
    where: { studentId, status: 'ACTIVE' },
    orderBy: { enrolledAt: 'asc' },
    select: { class: { select: { secureAssessmentMode: true } } },
  })

  return enrollment?.class.secureAssessmentMode ?? false
}

/**
 * Full resolution for one assessment. Short-circuits on the two free checks
 * before touching the database.
 */
export async function resolveSecureMode(
  studentId: string | undefined,
  assessmentType: string
): Promise<boolean> {
  if (!studentId) return false
  if (!isSecureAssessmentEnabled()) return false
  if (!isSecureAssessmentType(assessmentType)) return false
  return resolveSecureModeForStudent(studentId)
}
