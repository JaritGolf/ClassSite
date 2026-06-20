/**
 * Parent Portal — authorization (Phase 18, audit §36.19 items 2 & 3)
 *
 * A parent may only see a student they are linked to AND whose link is VERIFIED.
 * PENDING / REJECTED links — and any non-linked student — surface nothing. The
 * whole portal is additionally gated by FEATURE_PARENT_PORTAL.
 */

import { prisma } from '@/lib/db'
import { isParentPortalEnabled } from './feature'

export class ParentAccessError extends Error {
  constructor(
    public readonly code: 'PORTAL_DISABLED' | 'NOT_LINKED' | 'NOT_VERIFIED',
    message: string
  ) {
    super(message)
    this.name = 'ParentAccessError'
  }
}

export interface LinkedStudent {
  studentId: string
  displayName: string
  relationship: string
}

/** Resolve a Parent.id from the logged-in user id, or null if none. */
async function resolveParentId(parentUserId: string): Promise<string | null> {
  const parent = await prisma.parent.findUnique({
    where: { userId: parentUserId },
    select: { id: true },
  })
  return parent?.id ?? null
}

/**
 * The students a parent is allowed to view: linked AND VERIFIED. Returns [] when
 * the portal is disabled or the user has no parent record / no verified links.
 */
export async function getVerifiedLinkedStudents(
  parentUserId: string
): Promise<LinkedStudent[]> {
  if (!isParentPortalEnabled()) return []
  const parentId = await resolveParentId(parentUserId)
  if (!parentId) return []

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId, verifiedStatus: 'VERIFIED' },
    select: {
      relationship: true,
      student: {
        select: { id: true, user: { select: { firstName: true, lastName: true } } },
      },
    },
  })

  return links.map((l) => ({
    studentId: l.student.id,
    displayName: `${l.student.user.firstName} ${l.student.user.lastName}`,
    relationship: l.relationship,
  }))
}

/**
 * Throw unless the parent may view this student (portal enabled + VERIFIED link).
 */
export async function assertParentCanViewStudent(
  parentUserId: string,
  studentId: string
): Promise<void> {
  if (!isParentPortalEnabled()) {
    throw new ParentAccessError('PORTAL_DISABLED', 'Parent portal is not enabled')
  }
  const parentId = await resolveParentId(parentUserId)
  if (!parentId) {
    throw new ParentAccessError('NOT_LINKED', 'No parent record for this user')
  }
  const link = await prisma.parentStudentLink.findUnique({
    where: { parentId_studentId: { parentId, studentId } },
    select: { verifiedStatus: true },
  })
  if (!link) {
    throw new ParentAccessError('NOT_LINKED', 'Parent is not linked to this student')
  }
  if (link.verifiedStatus !== 'VERIFIED') {
    throw new ParentAccessError('NOT_VERIFIED', 'This link has not been verified yet')
  }
}
