/**
 * Audit 13 — Item 7 (loop closure, the Phase 13 deliverable):
 * Once an admin approves a calibration run, readiness scoring actually USES the
 * approved weights instead of the hard-coded blueprint baseline.
 *
 * Seeds a run that sets "Government Policies" to 0.40 (blueprint baseline is 0.175),
 * approves it, then asserts computeStudentReadiness applies 0.40 to that category.
 * Prefix: test-audit13-06-
 */

import { PrismaClient } from '@prisma/client'
import {
  approveCalibrationRun,
  getActiveWeightSource,
  computeStudentReadiness,
} from '@/lib/eoc-analytics'

const prisma = new PrismaClient()

const ADMIN_CLEVERID = 'test-audit13-06-admin'
const STUDENT_CLEVERID = 'test-audit13-06-student'
const SCHOOL_YEAR = '2099-2100'

let adminUserId: string
let studentId: string
let runId: string

const CALIBRATED = {
  'Origins and Purposes': { current: 0.275, recommended: 0.2, deltaPercent: -27.3 },
  'Roles, Rights, and Responsibilities': { current: 0.275, recommended: 0.2, deltaPercent: -27.3 },
  'Government Policies': { current: 0.175, recommended: 0.4, deltaPercent: 128.6 },
  'Organization and Function': { current: 0.225, recommended: 0.2, deltaPercent: -11.1 },
}

beforeAll(async () => {
  const admin = await prisma.user.upsert({
    where: { cleverId: ADMIN_CLEVERID },
    create: { cleverId: ADMIN_CLEVERID, email: `${ADMIN_CLEVERID}@test.invalid`, firstName: 'A13', lastName: '06Admin', role: 'ADMIN' },
    update: {},
    select: { id: true },
  })
  adminUserId = admin.id

  const sUser = await prisma.user.upsert({
    where: { cleverId: STUDENT_CLEVERID },
    create: { cleverId: STUDENT_CLEVERID, email: `${STUDENT_CLEVERID}@test.invalid`, firstName: 'A13', lastName: '06Stu', role: 'STUDENT' },
    update: {},
    select: { id: true },
  })
  const student = await prisma.student.upsert({ where: { userId: sUser.id }, create: { userId: sUser.id }, update: {}, select: { id: true } })
  studentId = student.id

  const run = await prisma.eocCalibrationRun.create({
    data: {
      schoolYear: SCHOOL_YEAR,
      correlationReadinessToScaled: 0.65,
      recommendedWeightChanges: CALIBRATED,
      applied: false,
    },
    select: { id: true },
  })
  runId = run.id
})

afterAll(async () => {
  // Remove the approved run FIRST so global active-weights returns to baseline.
  await prisma.eocCalibrationRun.deleteMany({ where: { id: runId } })
  await prisma.auditLog.deleteMany({ where: { actorUserId: adminUserId } })
  await prisma.student.deleteMany({ where: { id: studentId } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [ADMIN_CLEVERID, STUDENT_CLEVERID] } } })
  await prisma.$disconnect()
})

describe('Audit 13 — Item 7: calibration loop closes (approved weights drive readiness)', () => {
  it('7a. after approval, getActiveWeightSource reports the calibrated run', async () => {
    await approveCalibrationRun(adminUserId, runId, 'audit13-06 loop closure')
    const source = await getActiveWeightSource()
    expect(source.source).toBe('calibrated')
    expect(source.runId).toBe(runId)
    expect(source.weights['Government Policies']).toBeCloseTo(0.4, 6)
  })

  it('7b. computeStudentReadiness applies the calibrated weight (0.40), not blueprint (0.175)', async () => {
    const readiness = await computeStudentReadiness(studentId)
    const govPolicies = readiness.byCategory.find((c) =>
      c.name.toLowerCase().includes('government policies')
    )
    expect(govPolicies).toBeDefined()
    expect(govPolicies!.weight).toBeCloseTo(0.4, 6)
  })
})
