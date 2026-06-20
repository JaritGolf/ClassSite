/**
 * Audit 18 — Item 4: parent login events are captured in the audit log.
 * Tests recordParentLoginEvent (the logic behind the NextAuth events.signIn hook).
 * Prefix: test-audit18-04-
 */

import { PrismaClient } from '@prisma/client'
import { recordParentLoginEvent } from '@/lib/parent-portal'

const prisma = new PrismaClient()

const PARENT = 'test-audit18-04-parent'
const TEACHER = 'test-audit18-04-teacher'

let parentUserId: string
let teacherUserId: string

beforeAll(async () => {
  const p = await prisma.user.upsert({
    where: { cleverId: PARENT },
    create: { cleverId: PARENT, email: `${PARENT}@test.invalid`, firstName: 'Pat', lastName: 'Parent', role: 'PARENT' },
    update: {},
    select: { id: true },
  })
  parentUserId = p.id
  const t = await prisma.user.upsert({
    where: { cleverId: TEACHER },
    create: { cleverId: TEACHER, email: `${TEACHER}@test.invalid`, firstName: 'Ms', lastName: 'Teacher', role: 'TEACHER' },
    update: {},
    select: { id: true },
  })
  teacherUserId = t.id
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: [parentUserId, teacherUserId] } } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [PARENT, TEACHER] } } })
  await prisma.$disconnect()
})

describe('Audit 18 — Item 4: login audit', () => {
  it('writes PARENT_LOGIN for a parent sign-in', async () => {
    const wrote = await recordParentLoginEvent(parentUserId)
    expect(wrote).toBe(true)
    const count = await prisma.auditLog.count({
      where: { action: 'PARENT_LOGIN', actorUserId: parentUserId },
    })
    expect(count).toBe(1)
  })

  it('does NOT write for a non-parent sign-in', async () => {
    const wrote = await recordParentLoginEvent(teacherUserId)
    expect(wrote).toBe(false)
    const count = await prisma.auditLog.count({
      where: { action: 'PARENT_LOGIN', actorUserId: teacherUserId },
    })
    expect(count).toBe(0)
  })

  it('is a no-op for an empty user id', async () => {
    expect(await recordParentLoginEvent('')).toBe(false)
  })
})
