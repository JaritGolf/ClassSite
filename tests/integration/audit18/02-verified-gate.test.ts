/**
 * Audit 18 — Items 2 & 3: only VERIFIED links surface data; parent cannot reach
 * other students; the portal flag gates everything.
 * Prefix: test-audit18-02-
 */

import { PrismaClient } from '@prisma/client'
import { seedReportingCategories } from '../../../seed/reporting_categories'
import { seedBenchmarks } from '../../../seed/benchmarks'
import {
  createParentAccount,
  linkParentToStudent,
  setLinkVerification,
  getVerifiedLinkedStudents,
  getParentSummaryForParent,
} from '@/lib/parent-portal'

const prisma = new PrismaClient()

const ADMIN = 'test-audit18-02-admin'
const STUDENT = 'test-audit18-02-student'
const OTHER = 'test-audit18-02-other'
const PARENT_EMAIL = 'test-audit18-02-parent@test.invalid'

let adminUserId: string
let studentId: string
let otherStudentId: string
let parentUserId: string
let parentId: string
let linkId: string

beforeAll(async () => {
  process.env.FEATURE_PARENT_PORTAL = 'true'
  await seedReportingCategories(prisma)
  await seedBenchmarks(prisma)

  const admin = await prisma.user.upsert({
    where: { cleverId: ADMIN },
    create: { cleverId: ADMIN, email: `${ADMIN}@test.invalid`, firstName: 'A18', lastName: 'Admin', role: 'ADMIN' },
    update: {},
    select: { id: true },
  })
  adminUserId = admin.id

  for (const [clever, ref] of [[STUDENT, 'a'], [OTHER, 'b']] as const) {
    const u = await prisma.user.upsert({
      where: { cleverId: clever },
      create: { cleverId: clever, email: `${clever}@test.invalid`, firstName: 'A18', lastName: ref, role: 'STUDENT' },
      update: {},
      select: { id: true },
    })
    const s = await prisma.student.upsert({
      where: { userId: u.id },
      create: { userId: u.id, gradeLevel: 7 },
      update: {},
      select: { id: true },
    })
    if (clever === STUDENT) studentId = s.id
    else otherStudentId = s.id
  }

  const parent = await createParentAccount(adminUserId, {
    email: PARENT_EMAIL,
    firstName: 'Pat',
    lastName: 'Parent',
  })
  parentId = parent.parentId
  parentUserId = parent.userId
  linkId = (await linkParentToStudent(adminUserId, parentId, studentId, 'guardian')).linkId
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: [adminUserId, parentUserId].filter(Boolean) } } })
  await prisma.parentStudentLink.deleteMany({ where: { parentId } })
  await prisma.parent.deleteMany({ where: { id: parentId } })
  await prisma.student.deleteMany({ where: { id: { in: [studentId, otherStudentId] } } })
  await prisma.user.deleteMany({ where: { email: PARENT_EMAIL } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [ADMIN, STUDENT, OTHER] } } })
  await prisma.$disconnect()
})

describe('Audit 18 — Items 2 & 3: verified gate + isolation', () => {
  it('VERIFIED link surfaces the student summary', async () => {
    await setLinkVerification(adminUserId, linkId, 'VERIFIED')

    const linked = await getVerifiedLinkedStudents(parentUserId)
    expect(linked.map((l) => l.studentId)).toEqual([studentId])

    const vm = await getParentSummaryForParent(parentUserId, studentId)
    expect(vm.student).toBeDefined()
    expect(vm.eocReadiness).toBeDefined()
  })

  it('REJECTED link surfaces nothing', async () => {
    await setLinkVerification(adminUserId, linkId, 'REJECTED')
    expect(await getVerifiedLinkedStudents(parentUserId)).toHaveLength(0)
    await expect(getParentSummaryForParent(parentUserId, studentId)).rejects.toMatchObject({
      code: 'NOT_VERIFIED',
    })
    await setLinkVerification(adminUserId, linkId, 'VERIFIED') // restore for later assertions
  })

  it('a non-linked student is NOT_LINKED (no cross-student access)', async () => {
    await expect(getParentSummaryForParent(parentUserId, otherStudentId)).rejects.toMatchObject({
      code: 'NOT_LINKED',
    })
  })

  it('the portal flag gates access (PORTAL_DISABLED when off)', async () => {
    process.env.FEATURE_PARENT_PORTAL = 'false'
    expect(await getVerifiedLinkedStudents(parentUserId)).toHaveLength(0)
    await expect(getParentSummaryForParent(parentUserId, studentId)).rejects.toMatchObject({
      code: 'PORTAL_DISABLED',
    })
    process.env.FEATURE_PARENT_PORTAL = 'true' // restore
  })
})
