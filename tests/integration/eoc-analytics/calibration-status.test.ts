/**
 * Integration tests — Calibration Status
 *
 * Tests getCalibrationStatus returns correct status for all 4 states:
 *   YEAR_ONE_NO_SCORES, AWAITING_FIRST_RUN, RUN_PENDING_APPROVAL, RUN_APPROVED
 * Prefix: test-eoc-cs-
 */

import { PrismaClient } from '@prisma/client'
import { getCalibrationStatus } from '@/lib/eoc-analytics/calibration-run'

const prisma = new PrismaClient()

const ADMIN_CLEVERID = 'test-eoc-cs-admin'
const S1_CLEVERID = 'test-eoc-cs-student'

let adminUserId: string
let studentId: string

const YEAR_NO_SCORES = '1999-cs-no-scores'
const YEAR_WITH_SCORES = '1999-cs-with-scores'
const YEAR_PENDING = '1999-cs-pending'
const YEAR_APPROVED = '1999-cs-approved'

const createdRunIds: string[] = []

beforeAll(async () => {
  const adminUser = await prisma.user.upsert({
    where: { cleverId: ADMIN_CLEVERID },
    create: {
      cleverId: ADMIN_CLEVERID,
      email: `${ADMIN_CLEVERID}@test.invalid`,
      firstName: 'Admin',
      lastName: 'CS',
      role: 'ADMIN',
    },
    update: {},
    select: { id: true },
  })
  adminUserId = adminUser.id

  const u = await prisma.user.upsert({
    where: { cleverId: S1_CLEVERID },
    create: {
      cleverId: S1_CLEVERID,
      email: `${S1_CLEVERID}@test.invalid`,
      firstName: 'CS',
      lastName: 'Student',
      role: 'STUDENT',
    },
    update: {},
    select: { id: true },
  })
  const st = await prisma.student.upsert({ where: { userId: u.id }, create: { userId: u.id }, update: {}, select: { id: true } })
  studentId = st.id

  // Seed scores for YEAR_WITH_SCORES, YEAR_PENDING, YEAR_APPROVED
  for (const yr of [YEAR_WITH_SCORES, YEAR_PENDING, YEAR_APPROVED]) {
    await prisma.eocActualScore.upsert({
      where: { studentId_schoolYear: { studentId, schoolYear: yr } },
      create: {
        studentId,
        schoolYear: yr,
        scaledScore: 300,
        achievementLevel: 3,
        enteredBy: adminUserId,
        consentAcknowledged: true,
      },
      update: {},
    })
  }

  // Seed runs for YEAR_PENDING (applied=false) and YEAR_APPROVED (applied=true)
  const pendingRun = await prisma.eocCalibrationRun.create({
    data: {
      schoolYear: YEAR_PENDING,
      applied: false,
      runAt: new Date(),
    },
    select: { id: true },
  })
  createdRunIds.push(pendingRun.id)

  const approvedRun = await prisma.eocCalibrationRun.create({
    data: {
      schoolYear: YEAR_APPROVED,
      applied: true,
      runAt: new Date(),
    },
    select: { id: true },
  })
  createdRunIds.push(approvedRun.id)
})

afterAll(async () => {
  await prisma.eocCalibrationRun.deleteMany({ where: { id: { in: createdRunIds } } })
  await prisma.eocActualScore.deleteMany({ where: { studentId } })
  await prisma.student.deleteMany({ where: { id: studentId } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [ADMIN_CLEVERID, S1_CLEVERID] } } })
  await prisma.$disconnect()
})

describe('getCalibrationStatus', () => {
  it('returns YEAR_ONE_NO_SCORES when scoreCount=0', async () => {
    const status = await getCalibrationStatus(YEAR_NO_SCORES)
    expect(status.status).toBe('YEAR_ONE_NO_SCORES')
    expect(status.latestRun).toBeNull()
    expect(status.scoreCount).toBe(0)
  })

  it('returns AWAITING_FIRST_RUN when scores exist but no runs', async () => {
    const status = await getCalibrationStatus(YEAR_WITH_SCORES)
    expect(status.status).toBe('AWAITING_FIRST_RUN')
    expect(status.latestRun).toBeNull()
    expect(status.scoreCount).toBeGreaterThan(0)
  })

  it('returns RUN_PENDING_APPROVAL when latest run applied=false', async () => {
    const status = await getCalibrationStatus(YEAR_PENDING)
    expect(status.status).toBe('RUN_PENDING_APPROVAL')
    expect(status.latestRun).not.toBeNull()
    expect(status.latestRun?.applied).toBe(false)
  })

  it('returns RUN_APPROVED when latest run applied=true', async () => {
    const status = await getCalibrationStatus(YEAR_APPROVED)
    expect(status.status).toBe('RUN_APPROVED')
    expect(status.latestRun).not.toBeNull()
    expect(status.latestRun?.applied).toBe(true)
  })
})
