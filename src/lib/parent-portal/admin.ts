/**
 * Parent Portal — admin provisioning (Phase 18, audit §36.19 item 1)
 *
 * Admin-only: create a parent account, link it to student(s), and set the link's
 * verification status. Identity verification is a STAFF action — see
 * docs/parent-identity-policy.md (the district fills in the proof requirements).
 * All mutations are transactional and audit-logged.
 */

import { prisma } from '@/lib/db'
import type { ParentVerifiedStatus } from '@prisma/client'

export class ParentAdminError extends Error {
  constructor(
    public readonly code: 'EMAIL_IN_USE' | 'STUDENT_NOT_FOUND' | 'PARENT_NOT_FOUND' | 'LINK_NOT_FOUND' | 'INVALID_STATUS',
    message: string
  ) {
    super(message)
    this.name = 'ParentAdminError'
  }
}

export interface CreateParentInput {
  email: string
  firstName: string
  lastName: string
}

/**
 * Create (or return the existing) parent account by email. Idempotent: a second
 * call with the same email returns the same parent. Refuses an email already
 * used by a non-parent account.
 */
export async function createParentAccount(
  actorUserId: string,
  input: CreateParentInput
): Promise<{ parentId: string; userId: string; created: boolean }> {
  const email = input.email.trim().toLowerCase()

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  })
  if (existing && existing.role !== 'PARENT') {
    throw new ParentAdminError('EMAIL_IN_USE', 'That email is already used by a non-parent account')
  }

  return prisma.$transaction(async (tx) => {
    const user = existing
      ? { id: existing.id }
      : await tx.user.create({
          data: {
            email,
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            role: 'PARENT',
            status: 'ACTIVE',
          },
          select: { id: true },
        })

    const parent = await tx.parent.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
      select: { id: true },
    })

    if (!existing) {
      await tx.auditLog.create({
        data: {
          actorUserId,
          action: 'PARENT_ACCOUNT_CREATED',
          entityType: 'Parent',
          entityId: parent.id,
          metadataJson: { email },
        },
      })
    }

    return { parentId: parent.id, userId: user.id, created: !existing }
  })
}

/**
 * Link a parent to a student. The link is created PENDING — it surfaces no data
 * until an admin verifies it. Idempotent by (parentId, studentId).
 */
export async function linkParentToStudent(
  actorUserId: string,
  parentId: string,
  studentId: string,
  relationship: string
): Promise<{ linkId: string }> {
  const [parent, student] = await Promise.all([
    prisma.parent.findUnique({ where: { id: parentId }, select: { id: true } }),
    prisma.student.findUnique({ where: { id: studentId }, select: { id: true } }),
  ])
  if (!parent) throw new ParentAdminError('PARENT_NOT_FOUND', 'Parent not found')
  if (!student) throw new ParentAdminError('STUDENT_NOT_FOUND', 'Student not found')

  return prisma.$transaction(async (tx) => {
    const link = await tx.parentStudentLink.upsert({
      where: { parentId_studentId: { parentId, studentId } },
      update: {},
      create: { parentId, studentId, relationship: relationship.trim() || 'guardian' },
      select: { id: true },
    })
    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'PARENT_LINK_CREATED',
        entityType: 'ParentStudentLink',
        entityId: link.id,
        metadataJson: { parentId, studentId, relationship },
      },
    })
    return { linkId: link.id }
  })
}

/**
 * Set a link's verification status (VERIFIED / REJECTED / PENDING). Only VERIFIED
 * links surface data to the parent.
 */
export async function setLinkVerification(
  actorUserId: string,
  linkId: string,
  status: ParentVerifiedStatus
): Promise<void> {
  if (!['PENDING', 'VERIFIED', 'REJECTED'].includes(status)) {
    throw new ParentAdminError('INVALID_STATUS', 'Invalid verification status')
  }
  const link = await prisma.parentStudentLink.findUnique({
    where: { id: linkId },
    select: { id: true },
  })
  if (!link) throw new ParentAdminError('LINK_NOT_FOUND', 'Link not found')

  await prisma.$transaction(async (tx) => {
    await tx.parentStudentLink.update({
      where: { id: linkId },
      data: { verifiedStatus: status },
    })
    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'PARENT_LINK_STATUS_CHANGED',
        entityType: 'ParentStudentLink',
        entityId: linkId,
        metadataJson: { status },
      },
    })
  })
}

export interface ParentRow {
  parentId: string
  userId: string
  email: string | null
  displayName: string
  links: Array<{
    linkId: string
    studentId: string
    studentName: string
    relationship: string
    verifiedStatus: ParentVerifiedStatus
  }>
}

/** List all parent accounts with their links (admin table). */
export async function listParents(): Promise<ParentRow[]> {
  const parents = await prisma.parent.findMany({
    select: {
      id: true,
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      studentLinks: {
        select: {
          id: true,
          relationship: true,
          verifiedStatus: true,
          student: {
            select: { id: true, user: { select: { firstName: true, lastName: true } } },
          },
        },
      },
    },
    orderBy: { id: 'desc' },
  })

  return parents.map((p) => ({
    parentId: p.id,
    userId: p.user.id,
    email: p.user.email,
    displayName: `${p.user.firstName} ${p.user.lastName}`,
    links: p.studentLinks.map((l) => ({
      linkId: l.id,
      studentId: l.student.id,
      studentName: `${l.student.user.firstName} ${l.student.user.lastName}`,
      relationship: l.relationship,
      verifiedStatus: l.verifiedStatus,
    })),
  }))
}
