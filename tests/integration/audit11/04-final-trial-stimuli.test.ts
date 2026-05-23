/**
 * Audit 11 — Item 4: Final Republic Trial uses level 2 and 3 stimuli only
 * (spec §19.3).
 *
 * Picks a Final Trial question set and asserts every selected question is
 * readingLoadLevel >= 2.
 *
 * Prefix: test-audit11-04-
 */

import { PrismaClient } from '@prisma/client'
import { pickFinalRepublicTrial } from '@/lib/republic-challenge'

const prisma = new PrismaClient()

let studentId: string

beforeAll(async () => {
  const u = await prisma.user.upsert({
    where: { cleverId: 'test-audit11-04-s1' },
    create: {
      cleverId: 'test-audit11-04-s1',
      firstName: 'Audit11',
      lastName: '04',
      role: 'STUDENT',
      status: 'ACTIVE',
    },
    update: {},
  })
  const s = await prisma.student.upsert({
    where: { userId: u.id },
    update: {},
    create: { userId: u.id },
  })
  studentId = s.id
})

afterAll(async () => {
  await prisma.student.deleteMany({
    where: { user: { cleverId: { startsWith: 'test-audit11-04-' } } },
  })
  await prisma.user.deleteMany({
    where: { cleverId: { startsWith: 'test-audit11-04-' } },
  })
  await prisma.$disconnect()
})

describe('Audit 11 item 4 — Final Trial uses level ≥ 2 stimuli only', () => {
  it('every picked question has readingLoadLevel >= 2', async () => {
    const ids = await pickFinalRepublicTrial(studentId, 25)
    expect(ids.length).toBeGreaterThan(0)
    const questions = await prisma.question.findMany({
      where: { id: { in: ids } },
      select: { readingLoadLevel: true },
    })
    expect(questions.every((q) => q.readingLoadLevel >= 2)).toBe(true)
  })
})
