/**
 * Integration tests — EOC Score Import (single row)
 *
 * Tests importEocScore: consent gate, student not found, successful import.
 * Prefix: test-eoc-si-
 */

import { PrismaClient } from '@prisma/client'
import { importEocScore, ScoreImportError } from '@/lib/eoc-analytics/score-import'

const prisma = new PrismaClient()

const STUDENT_CLEVERID = 'test-eoc-si-student-1'
const ADMIN_CLEVERID = 'test-eoc-si-admin-1'

let studentId: string
let adminUserId: string

beforeAll(async () => {
  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { cleverId: ADMIN_CLEVERID },
    create: {
      cleverId: ADMIN_CLEVERID,
      email: `${ADMIN_CLEVERID}@test.invalid`,
      firstName: 'Admin',
      lastName: 'SI',
      role: 'ADMIN',
    },
    update: {},
    select: { id: true },
  })
  adminUserId = adminUser.id

  // Create student user
  const studentUser = await prisma.user.upsert({
    where: { cleverId: STUDENT_CLEVERID },
    create: {
      cleverId: STUDENT_CLEVERID,
      email: `${STUDENT_CLEVERID}@test.invalid`,
      firstName: 'Score',
      lastName: 'Import',
      role: 'STUDENT',
    },
    update: {},
    select: { id: true },
  })
  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    create: { userId: studentUser.id },
    update: {},
    select: { id: true },
  })
  studentId = student.id
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { actorUserId: adminUserId } })
  await prisma.eocActualScore.deleteMany({ where: { studentId } })
  await prisma.student.deleteMany({ where: { id: studentId } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [STUDENT_CLEVERID, ADMIN_CLEVERID] } } })
  await prisma.$disconnect()
})

describe('importEocScore — single row', () => {
  it('throws ScoreImportError(NO_CONSENT) when consentAcknowledged=false', async () => {
    await expect(
      importEocScore(adminUserId, {
        studentExternalKey: STUDENT_CLEVERID,
        schoolYear: '2025-2026',
        scaledScore: 300,
        achievementLevel: 3,
        consentAcknowledged: false,
      })
    ).rejects.toMatchObject({ code: 'NO_CONSENT' })
  })

  it('throws ScoreImportError(STUDENT_NOT_FOUND) for unknown external key', async () => {
    await expect(
      importEocScore(adminUserId, {
        studentExternalKey: 'nonexistent-clever-id',
        schoolYear: '2025-2026',
        scaledScore: 300,
        achievementLevel: 3,
        consentAcknowledged: true,
      })
    ).rejects.toMatchObject({ code: 'STUDENT_NOT_FOUND' })
  })

  it('successfully imports a score and returns id + auditLogId', async () => {
    const result = await importEocScore(adminUserId, {
      studentExternalKey: STUDENT_CLEVERID,
      schoolYear: '2025-2026',
      scaledScore: 320,
      achievementLevel: 3,
      consentAcknowledged: true,
    })
    expect(typeof result.id).toBe('string')
    expect(result.id.length).toBeGreaterThan(0)
    expect(typeof result.auditLogId).toBe('string')
    expect(result.auditLogId.length).toBeGreaterThan(0)
  })

  it('writes EocActualScore row to DB', async () => {
    const score = await prisma.eocActualScore.findFirst({
      where: { studentId, schoolYear: '2025-2026' },
    })
    expect(score).not.toBeNull()
    expect(score?.scaledScore).toBe(320)
    expect(score?.achievementLevel).toBe(3)
    expect(score?.consentAcknowledged).toBe(true)
  })

  it('writes AuditLog with action=EOC_SCORE_IMPORTED', async () => {
    const log = await prisma.auditLog.findFirst({
      where: { actorUserId: adminUserId, action: 'EOC_SCORE_IMPORTED' },
    })
    expect(log).not.toBeNull()
    expect(log?.entityType).toBe('EocActualScore')
  })

  it('upserts (idempotent) — updating score on reimport', async () => {
    // Reimport with updated scaledScore
    await importEocScore(adminUserId, {
      studentExternalKey: STUDENT_CLEVERID,
      schoolYear: '2025-2026',
      scaledScore: 350,
      achievementLevel: 4,
      consentAcknowledged: true,
    })
    const score = await prisma.eocActualScore.findFirst({
      where: { studentId, schoolYear: '2025-2026' },
    })
    expect(score?.scaledScore).toBe(350)
    expect(score?.achievementLevel).toBe(4)
  })

  it('ScoreImportError instances have code and name properties', async () => {
    try {
      await importEocScore(adminUserId, {
        studentExternalKey: STUDENT_CLEVERID,
        schoolYear: '2025-2026',
        consentAcknowledged: false,
      })
    } catch (err) {
      expect(err instanceof ScoreImportError).toBe(true)
      expect((err as ScoreImportError).code).toBe('NO_CONSENT')
      expect((err as ScoreImportError).name).toBe('ScoreImportError')
    }
  })
})
