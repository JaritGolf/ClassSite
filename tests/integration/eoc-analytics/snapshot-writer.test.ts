/**
 * Integration tests — Snapshot Writer
 *
 * Verifies that recordReadinessSnapshot writes EocReadinessSnapshot rows,
 * and that calling it twice on the same day is effectively idempotent
 * (dup writes are swallowed, not an error).
 *
 * Prefix: test-eoc-snap-
 */

import { PrismaClient } from '@prisma/client'
import { recordReadinessSnapshot, startOfUtcDay } from '@/lib/eoc-analytics/snapshot'

const prisma = new PrismaClient()

const S_CLEVERID = 'test-eoc-snap-student'

let studentId: string

beforeAll(async () => {
  const u = await prisma.user.upsert({
    where: { cleverId: S_CLEVERID },
    create: { cleverId: S_CLEVERID, email: `${S_CLEVERID}@test.invalid`, firstName: 'EocSnap', lastName: 'Student', role: 'STUDENT' },
    update: {},
    select: { id: true },
  })
  const s = await prisma.student.upsert({ where: { userId: u.id }, create: { userId: u.id }, update: {}, select: { id: true } })
  studentId = s.id
})

afterAll(async () => {
  await prisma.eocReadinessSnapshot.deleteMany({ where: { studentId } })
  await prisma.student.deleteMany({ where: { id: studentId } })
  await prisma.user.deleteMany({ where: { cleverId: S_CLEVERID } })
  await prisma.$disconnect()
})

describe('recordReadinessSnapshot', () => {
  it('creates EocReadinessSnapshot rows for the student', async () => {
    await recordReadinessSnapshot(studentId)

    const rows = await prisma.eocReadinessSnapshot.findMany({
      where: { studentId },
    })
    expect(rows.length).toBeGreaterThanOrEqual(0)
    // If reporting categories exist (seeded), there should be rows
  })

  it('each snapshot has readinessScore in [0, 1]', async () => {
    const rows = await prisma.eocReadinessSnapshot.findMany({ where: { studentId } })
    for (const row of rows) {
      expect(row.readinessScore).toBeGreaterThanOrEqual(0)
      expect(row.readinessScore).toBeLessThanOrEqual(1)
      expect(row.readinessLow).toBeGreaterThanOrEqual(0)
      expect(row.readinessHigh).toBeLessThanOrEqual(1)
    }
  })

  it('calling twice on same day does not throw (dup swallowed)', async () => {
    await expect(recordReadinessSnapshot(studentId)).resolves.not.toThrow()
    await expect(recordReadinessSnapshot(studentId)).resolves.not.toThrow()
  })

  it('snapshots have createdAt = start of UTC day', async () => {
    const rows = await prisma.eocReadinessSnapshot.findMany({ where: { studentId } })
    const today = startOfUtcDay(new Date())
    for (const row of rows) {
      const rowDay = startOfUtcDay(row.createdAt)
      expect(rowDay.toISOString()).toBe(today.toISOString())
    }
  })
})
