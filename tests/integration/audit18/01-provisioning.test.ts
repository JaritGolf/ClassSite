/**
 * Audit 18 — Item 1: Admin provisions a parent account + link.
 *  - createParentAccount is idempotent and writes PARENT_ACCOUNT_CREATED
 *  - linkParentToStudent creates a PENDING link + PARENT_LINK_CREATED
 *  - a PENDING link surfaces NO data (gate is verification, not just the flag)
 * Prefix: test-audit18-01-
 */

import { PrismaClient } from '@prisma/client'
import {
  createParentAccount,
  linkParentToStudent,
  getVerifiedLinkedStudents,
  getParentSummaryForParent,
  ParentAccessError,
} from '@/lib/parent-portal'

const prisma = new PrismaClient()

const ADMIN = 'test-audit18-01-admin'
const STUDENT = 'test-audit18-01-student'
const PARENT_EMAIL = 'test-audit18-01-parent@test.invalid'

let adminUserId: string
let studentId: string
let parentUserId: string
let parentId: string

beforeAll(async () => {
  process.env.FEATURE_PARENT_PORTAL = 'true'

  const admin = await prisma.user.upsert({
    where: { cleverId: ADMIN },
    create: { cleverId: ADMIN, email: `${ADMIN}@test.invalid`, firstName: 'A18', lastName: 'Admin', role: 'ADMIN' },
    update: {},
    select: { id: true },
  })
  adminUserId = admin.id

  const sUser = await prisma.user.upsert({
    where: { cleverId: STUDENT },
    create: { cleverId: STUDENT, email: `${STUDENT}@test.invalid`, firstName: 'A18', lastName: 'Student', role: 'STUDENT' },
    update: {},
    select: { id: true },
  })
  const student = await prisma.student.upsert({
    where: { userId: sUser.id },
    create: { userId: sUser.id, gradeLevel: 7 },
    update: {},
    select: { id: true },
  })
  studentId = student.id
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: [adminUserId, parentUserId].filter(Boolean) } } })
  if (parentId) {
    await prisma.parentStudentLink.deleteMany({ where: { parentId } })
    await prisma.parent.deleteMany({ where: { id: parentId } })
  }
  await prisma.student.deleteMany({ where: { id: studentId } })
  await prisma.user.deleteMany({ where: { email: PARENT_EMAIL } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [ADMIN, STUDENT] } } })
  await prisma.$disconnect()
})

describe('Audit 18 — Item 1: provisioning', () => {
  it('creates a parent account idempotently and audit-logs it', async () => {
    const first = await createParentAccount(adminUserId, {
      email: PARENT_EMAIL,
      firstName: 'Pat',
      lastName: 'Parent',
    })
    expect(first.created).toBe(true)
    parentId = first.parentId
    parentUserId = first.userId

    const second = await createParentAccount(adminUserId, {
      email: PARENT_EMAIL,
      firstName: 'Pat',
      lastName: 'Parent',
    })
    expect(second.created).toBe(false)
    expect(second.parentId).toBe(parentId)

    const logs = await prisma.auditLog.count({
      where: { action: 'PARENT_ACCOUNT_CREATED', entityId: parentId },
    })
    expect(logs).toBe(1) // only the first (created) call logs
  })

  it('links to a student as PENDING (no data) and audit-logs it', async () => {
    const { linkId } = await linkParentToStudent(adminUserId, parentId, studentId, 'mother')
    expect(linkId).toBeTruthy()

    const link = await prisma.parentStudentLink.findUniqueOrThrow({ where: { id: linkId } })
    expect(link.verifiedStatus).toBe('PENDING')

    // PENDING → parent sees nothing.
    expect(await getVerifiedLinkedStudents(parentUserId)).toHaveLength(0)
    await expect(getParentSummaryForParent(parentUserId, studentId)).rejects.toMatchObject({
      name: 'ParentAccessError',
      code: 'NOT_VERIFIED',
    })

    const logged = await prisma.auditLog.count({
      where: { action: 'PARENT_LINK_CREATED', entityId: linkId },
    })
    expect(logged).toBe(1)
  })

  it('uses the ParentAccessError class', async () => {
    await expect(getParentSummaryForParent(parentUserId, studentId)).rejects.toBeInstanceOf(
      ParentAccessError
    )
  })
})
