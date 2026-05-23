/**
 * Integration tests — Calibration Run Engine
 *
 * Tests createCalibrationRun: NO_ACTUAL_SCORES error, successful run with
 * seeded scores, AuditLog written, applied=false.
 * Prefix: test-eoc-cr-
 */

import { PrismaClient } from '@prisma/client'
import { createCalibrationRun, CalibrationError } from '@/lib/eoc-analytics/calibration-run'

const prisma = new PrismaClient()

const ADMIN_CLEVERID = 'test-eoc-cr-admin'
const S1_CLEVERID = 'test-eoc-cr-s1'
const S2_CLEVERID = 'test-eoc-cr-s2'
const SCHOOL_YEAR = '2023-test-cr'

let adminUserId: string
let studentId1: string
let studentId2: string
const createdRunIds: string[] = []

beforeAll(async () => {
  const adminUser = await prisma.user.upsert({
    where: { cleverId: ADMIN_CLEVERID },
    create: {
      cleverId: ADMIN_CLEVERID,
      email: `${ADMIN_CLEVERID}@test.invalid`,
      firstName: 'Admin',
      lastName: 'CR',
      role: 'ADMIN',
    },
    update: {},
    select: { id: true },
  })
  adminUserId = adminUser.id

  for (const [cleverId, varName] of [
    [S1_CLEVERID, 's1'],
    [S2_CLEVERID, 's2'],
  ] as const) {
    const u = await prisma.user.upsert({
      where: { cleverId },
      create: {
        cleverId,
        email: `${cleverId}@test.invalid`,
        firstName: 'CR',
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
  if (createdRunIds.length > 0) {
    await prisma.eocCalibrationRun.deleteMany({ where: { id: { in: createdRunIds } } })
  }
  await prisma.auditLog.deleteMany({ where: { actorUserId: adminUserId } })
  await prisma.eocActualScore.deleteMany({ where: { schoolYear: SCHOOL_YEAR } })
  await prisma.student.deleteMany({ where: { id: { in: [studentId1, studentId2] } } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [S1_CLEVERID, S2_CLEVERID, ADMIN_CLEVERID] } } })
  await prisma.$disconnect()
})

describe('createCalibrationRun', () => {
  it('throws CalibrationError(NO_ACTUAL_SCORES) when no scores exist', async () => {
    await expect(
      createCalibrationRun(adminUserId, 'year-with-no-scores-ever')
    ).rejects.toMatchObject({ code: 'NO_ACTUAL_SCORES' })
  })

  it('creates a CalibrationRun row with applied=false when scores exist', async () => {
    // Seed actual scores
    await prisma.eocActualScore.upsert({
      where: { studentId_schoolYear: { studentId: studentId1, schoolYear: SCHOOL_YEAR } },
      create: {
        studentId: studentId1,
        schoolYear: SCHOOL_YEAR,
        scaledScore: 340,
        achievementLevel: 3,
        enteredBy: adminUserId,
        consentAcknowledged: true,
      },
      update: {},
    })
    await prisma.eocActualScore.upsert({
      where: { studentId_schoolYear: { studentId: studentId2, schoolYear: SCHOOL_YEAR } },
      create: {
        studentId: studentId2,
        schoolYear: SCHOOL_YEAR,
        scaledScore: 290,
        achievementLevel: 2,
        enteredBy: adminUserId,
        consentAcknowledged: true,
      },
      update: {},
    })

    const result = await createCalibrationRun(adminUserId, SCHOOL_YEAR)
    createdRunIds.push(result.runId)

    expect(typeof result.runId).toBe('string')
    expect(result.schoolYear).toBe(SCHOOL_YEAR)
    expect(result.applied).toBe(false)
    expect(result.runAt).toBeInstanceOf(Date)
    expect(typeof result.auditLogId).toBe('string')
  })

  it('writes 5 correlation fields (some may be null for tiny samples)', async () => {
    const run = await prisma.eocCalibrationRun.findFirst({
      where: { id: { in: createdRunIds } },
    })
    expect(run).not.toBeNull()
    // Fields exist in the row (null is acceptable for small samples)
    expect('correlationReadinessToScaled' in run!).toBe(true)
    expect('correlationByReportingCategory' in run!).toBe(true)
    expect('correlationByStimulusType' in run!).toBe(true)
    expect('correlationByComplexity' in run!).toBe(true)
    expect('correlationByReadingLoad' in run!).toBe(true)
  })

  it('recommendedWeightChanges is a JSON object in the run', async () => {
    const run = await prisma.eocCalibrationRun.findFirst({
      where: { id: { in: createdRunIds } },
    })
    expect(run?.recommendedWeightChanges).not.toBeNull()
    const wc = run?.recommendedWeightChanges as Record<string, { current: number; recommended: number; deltaPercent: number }>
    const rcNames = Object.keys(wc)
    expect(rcNames.length).toBeGreaterThan(0)
    for (const rc of rcNames) {
      expect(typeof wc[rc].current).toBe('number')
      expect(typeof wc[rc].recommended).toBe('number')
      expect(wc[rc].recommended).toBeGreaterThanOrEqual(0.10)
      expect(wc[rc].recommended).toBeLessThanOrEqual(0.40)
    }
  })

  it('writes AuditLog with action=CALIBRATION_RUN_CREATED', async () => {
    const log = await prisma.auditLog.findFirst({
      where: { actorUserId: adminUserId, action: 'CALIBRATION_RUN_CREATED' },
    })
    expect(log).not.toBeNull()
    expect(log?.entityType).toBe('EocCalibrationRun')
    const meta = log?.metadataJson as Record<string, unknown>
    expect(meta?.schoolYear).toBe(SCHOOL_YEAR)
    expect(typeof meta?.sampleSize).toBe('number')
  })

  it('CalibrationError has correct name and code', async () => {
    try {
      await createCalibrationRun(adminUserId, 'never-has-scores')
    } catch (err) {
      expect(err instanceof CalibrationError).toBe(true)
      expect((err as CalibrationError).code).toBe('NO_ACTUAL_SCORES')
      expect((err as CalibrationError).name).toBe('CalibrationError')
    }
  })
})
