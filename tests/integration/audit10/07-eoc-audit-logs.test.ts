/**
 * Audit 10 — Item 7: EOC AuditLog catalog complete (Slice 10b extras)
 *
 * Exercises all 4 new audit-log action strings introduced in slice 10b:
 *   - EOC_SCORE_IMPORTED
 *   - EOC_SCORE_BATCH_IMPORTED
 *   - CALIBRATION_RUN_CREATED
 *   - CALIBRATION_WEIGHTS_APPROVED
 *
 * Asserts one AuditLog row per action with the exact action string,
 * correct entityType, and expected metadataJson fields.
 *
 * Prefix: test-audit10-07-
 */

import { PrismaClient } from '@prisma/client'
import { importEocScore, importEocScoresBatch } from '@/lib/eoc-analytics/score-import'
import { createCalibrationRun } from '@/lib/eoc-analytics/calibration-run'
import { approveCalibrationRun } from '@/lib/eoc-analytics/calibration-approve'

const prisma = new PrismaClient()

const ADMIN_CLEVERID = 'test-audit10-07-admin'
const STUDENT_CLEVERID = 'test-audit10-07-student'
const SCHOOL_YEAR = '1996-audit10-07'

let adminUserId: string
let studentId: string
const createdRunIds: string[] = []

beforeAll(async () => {
  const adminUser = await prisma.user.upsert({
    where: { cleverId: ADMIN_CLEVERID },
    create: {
      cleverId: ADMIN_CLEVERID,
      email: `${ADMIN_CLEVERID}@test.invalid`,
      firstName: 'Audit10',
      lastName: '07Admin',
      role: 'ADMIN',
    },
    update: {},
    select: { id: true },
  })
  adminUserId = adminUser.id

  const studentUser = await prisma.user.upsert({
    where: { cleverId: STUDENT_CLEVERID },
    create: {
      cleverId: STUDENT_CLEVERID,
      email: `${STUDENT_CLEVERID}@test.invalid`,
      firstName: 'Audit10',
      lastName: '07Student',
      role: 'STUDENT',
    },
    update: {},
    select: { id: true },
  })
  const st = await prisma.student.upsert({
    where: { userId: studentUser.id },
    create: { userId: studentUser.id },
    update: {},
    select: { id: true },
  })
  studentId = st.id
})

afterAll(async () => {
  if (createdRunIds.length > 0) {
    await prisma.eocCalibrationRun.deleteMany({ where: { id: { in: createdRunIds } } })
  }
  await prisma.auditLog.deleteMany({ where: { actorUserId: adminUserId } })
  await prisma.eocActualScore.deleteMany({ where: { schoolYear: SCHOOL_YEAR } })
  await prisma.student.deleteMany({ where: { id: studentId } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [ADMIN_CLEVERID, STUDENT_CLEVERID] } } })
  await prisma.$disconnect()
})

describe('Audit 10 — Item 7: EOC AuditLog catalog', () => {
  it('7a. EOC_SCORE_IMPORTED — importEocScore writes AuditLog with correct action string', async () => {
    await importEocScore(adminUserId, {
      studentExternalKey: STUDENT_CLEVERID,
      schoolYear: SCHOOL_YEAR,
      scaledScore: 330,
      achievementLevel: 3,
      consentAcknowledged: true,
    })

    const log = await prisma.auditLog.findFirst({
      where: { actorUserId: adminUserId, action: 'EOC_SCORE_IMPORTED' },
      orderBy: { createdAt: 'desc' },
    })
    expect(log).not.toBeNull()
    expect(log?.action).toBe('EOC_SCORE_IMPORTED')
    expect(log?.entityType).toBe('EocActualScore')
    const meta = log?.metadataJson as Record<string, unknown>
    expect(meta?.studentExternalKey).toBe(STUDENT_CLEVERID)
    expect(meta?.schoolYear).toBe(SCHOOL_YEAR)
  })

  it('7b. EOC_SCORE_BATCH_IMPORTED — importEocScoresBatch writes batch AuditLog', async () => {
    await importEocScoresBatch(adminUserId, [
      {
        studentExternalKey: STUDENT_CLEVERID,
        schoolYear: SCHOOL_YEAR,
        scaledScore: 340,
        achievementLevel: 3,
        consentAcknowledged: true,
      },
    ])

    const log = await prisma.auditLog.findFirst({
      where: { actorUserId: adminUserId, action: 'EOC_SCORE_BATCH_IMPORTED' },
      orderBy: { createdAt: 'desc' },
    })
    expect(log).not.toBeNull()
    expect(log?.action).toBe('EOC_SCORE_BATCH_IMPORTED')
    expect(log?.entityType).toBe('EocActualScore')
    const meta = log?.metadataJson as Record<string, unknown>
    expect(typeof meta?.count).toBe('number')
    expect(typeof meta?.skippedCount).toBe('number')
    expect(meta?.schoolYear).toBe(SCHOOL_YEAR)
  })

  it('7c. CALIBRATION_RUN_CREATED — createCalibrationRun writes AuditLog', async () => {
    const result = await createCalibrationRun(adminUserId, SCHOOL_YEAR)
    createdRunIds.push(result.runId)

    const log = await prisma.auditLog.findFirst({
      where: { actorUserId: adminUserId, action: 'CALIBRATION_RUN_CREATED' },
      orderBy: { createdAt: 'desc' },
    })
    expect(log).not.toBeNull()
    expect(log?.action).toBe('CALIBRATION_RUN_CREATED')
    expect(log?.entityType).toBe('EocCalibrationRun')
    expect(log?.entityId).toBe(result.runId)
    const meta = log?.metadataJson as Record<string, unknown>
    expect(meta?.schoolYear).toBe(SCHOOL_YEAR)
    expect(typeof meta?.sampleSize).toBe('number')
    expect(meta?.sampleSize).toBeGreaterThan(0)
  })

  it('7d. CALIBRATION_WEIGHTS_APPROVED — approveCalibrationRun writes AuditLog', async () => {
    const reason = 'Audit 10 approval test — weights approved after reviewing correlations.'
    const result = await approveCalibrationRun(adminUserId, createdRunIds[0], reason)

    const log = await prisma.auditLog.findFirst({
      where: { actorUserId: adminUserId, action: 'CALIBRATION_WEIGHTS_APPROVED' },
      orderBy: { createdAt: 'desc' },
    })
    expect(log).not.toBeNull()
    expect(log?.action).toBe('CALIBRATION_WEIGHTS_APPROVED')
    expect(log?.entityType).toBe('EocCalibrationRun')
    expect(log?.entityId).toBe(createdRunIds[0])
    expect(log?.id).toBe(result.auditLogId)
    const meta = log?.metadataJson as Record<string, unknown>
    expect(meta?.reason).toBe(reason)
    expect(meta?.schoolYear).toBe(SCHOOL_YEAR)
  })

  it('7e. All 4 action strings are distinct and correct', async () => {
    const logs = await prisma.auditLog.findMany({
      where: {
        actorUserId: adminUserId,
        action: {
          in: [
            'EOC_SCORE_IMPORTED',
            'EOC_SCORE_BATCH_IMPORTED',
            'CALIBRATION_RUN_CREATED',
            'CALIBRATION_WEIGHTS_APPROVED',
          ],
        },
      },
      select: { action: true },
    })
    const actions = new Set(logs.map((l) => l.action))
    expect(actions.has('EOC_SCORE_IMPORTED')).toBe(true)
    expect(actions.has('EOC_SCORE_BATCH_IMPORTED')).toBe(true)
    expect(actions.has('CALIBRATION_RUN_CREATED')).toBe(true)
    expect(actions.has('CALIBRATION_WEIGHTS_APPROVED')).toBe(true)
  })
})
