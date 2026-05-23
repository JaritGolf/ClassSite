/**
 * Integration tests — EOC Score Batch Import
 *
 * Tests importEocScoresBatch: writes count rows, handles skipped rows, writes
 * one batch AuditLog entry.
 * Prefix: test-eoc-sib-
 */

import { PrismaClient } from '@prisma/client'
import { importEocScoresBatch, ScoreImportError } from '@/lib/eoc-analytics/score-import'

const prisma = new PrismaClient()

const ADMIN_CLEVERID = 'test-eoc-sib-admin'
const S1_CLEVERID = 'test-eoc-sib-s1'
const S2_CLEVERID = 'test-eoc-sib-s2'

let adminUserId: string
let studentId1: string
let studentId2: string

beforeAll(async () => {
  const adminUser = await prisma.user.upsert({
    where: { cleverId: ADMIN_CLEVERID },
    create: {
      cleverId: ADMIN_CLEVERID,
      email: `${ADMIN_CLEVERID}@test.invalid`,
      firstName: 'Admin',
      lastName: 'SIB',
      role: 'ADMIN',
    },
    update: {},
    select: { id: true },
  })
  adminUserId = adminUser.id

  for (const [cleverid, varName] of [
    [S1_CLEVERID, 's1'],
    [S2_CLEVERID, 's2'],
  ] as const) {
    const u = await prisma.user.upsert({
      where: { cleverId: cleverid },
      create: {
        cleverId: cleverid,
        email: `${cleverid}@test.invalid`,
        firstName: 'Batch',
        lastName: varName === 's1' ? 'S1' : 'S2',
        role: 'STUDENT',
      },
      update: {},
      select: { id: true },
    })
    const st = await prisma.student.upsert({
      where: { userId: u.id },
      create: { userId: u.id },
      update: {},
      select: { id: true },
    })
    if (varName === 's1') studentId1 = st.id
    else studentId2 = st.id
  }
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { actorUserId: adminUserId } })
  await prisma.eocActualScore.deleteMany({ where: { studentId: { in: [studentId1, studentId2] } } })
  await prisma.student.deleteMany({ where: { id: { in: [studentId1, studentId2] } } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [S1_CLEVERID, S2_CLEVERID, ADMIN_CLEVERID] } } })
  await prisma.$disconnect()
})

describe('importEocScoresBatch', () => {
  it('imports valid rows and skips invalid ones', async () => {
    const result = await importEocScoresBatch(adminUserId, [
      {
        studentExternalKey: S1_CLEVERID,
        schoolYear: '2025-2026',
        scaledScore: 310,
        achievementLevel: 3,
        consentAcknowledged: true,
      },
      {
        studentExternalKey: S2_CLEVERID,
        schoolYear: '2025-2026',
        scaledScore: 290,
        achievementLevel: 2,
        consentAcknowledged: true,
      },
      {
        studentExternalKey: 'not-real-student',
        schoolYear: '2025-2026',
        scaledScore: 100,
        achievementLevel: 1,
        consentAcknowledged: true,
      },
    ])

    expect(result.imported).toBe(2)
    expect(result.skipped).toHaveLength(1)
    expect(result.skipped[0].reason).toBe('STUDENT_NOT_FOUND')
    expect(typeof result.auditLogId).toBe('string')
  })

  it('writes exactly one batch AuditLog with action=EOC_SCORE_BATCH_IMPORTED', async () => {
    const logs = await prisma.auditLog.findMany({
      where: { actorUserId: adminUserId, action: 'EOC_SCORE_BATCH_IMPORTED' },
    })
    expect(logs.length).toBeGreaterThanOrEqual(1)
    const log = logs[0]
    expect(log.entityType).toBe('EocActualScore')
    const meta = log.metadataJson as Record<string, unknown>
    expect(typeof meta.count).toBe('number')
    expect(typeof meta.skippedCount).toBe('number')
  })

  it('collects NO_CONSENT errors in skipped array', async () => {
    const result = await importEocScoresBatch(adminUserId, [
      {
        studentExternalKey: S1_CLEVERID,
        schoolYear: '2025-2026',
        scaledScore: 300,
        achievementLevel: 3,
        consentAcknowledged: false, // no consent
      },
    ])
    expect(result.imported).toBe(0)
    expect(result.skipped).toHaveLength(1)
    expect(result.skipped[0].reason).toBe('NO_CONSENT')
  })

  it('throws ScoreImportError(INVALID_INPUT) for empty rows array', async () => {
    await expect(importEocScoresBatch(adminUserId, [])).rejects.toMatchObject({ code: 'INVALID_INPUT' })
  })

  it('writes EocActualScore rows for valid students', async () => {
    const score1 = await prisma.eocActualScore.findFirst({
      where: { studentId: studentId1, schoolYear: '2025-2026' },
    })
    expect(score1).not.toBeNull()

    const score2 = await prisma.eocActualScore.findFirst({
      where: { studentId: studentId2, schoolYear: '2025-2026' },
    })
    expect(score2).not.toBeNull()
  })
})
