/**
 * Audit 13 — Item 2: Score import respects the district consent flag.
 *
 * importEocScore must reject a row with consentAcknowledged !== true (NO_CONSENT)
 * and accept the same row once consent is acknowledged. Prefix: test-audit13-02-
 */

import { PrismaClient } from '@prisma/client'
import { importEocScore, ScoreImportError } from '@/lib/eoc-analytics'

const prisma = new PrismaClient()

const ADMIN_CLEVERID = 'test-audit13-02-admin'
const STUDENT_CLEVERID = 'test-audit13-02-student'
const SCHOOL_YEAR = '2025-2026'

let adminUserId: string
let studentUserId: string

beforeAll(async () => {
  const admin = await prisma.user.upsert({
    where: { cleverId: ADMIN_CLEVERID },
    create: { cleverId: ADMIN_CLEVERID, email: `${ADMIN_CLEVERID}@test.invalid`, firstName: 'A13', lastName: '02Admin', role: 'ADMIN' },
    update: {},
    select: { id: true },
  })
  adminUserId = admin.id

  const sUser = await prisma.user.upsert({
    where: { cleverId: STUDENT_CLEVERID },
    create: { cleverId: STUDENT_CLEVERID, email: `${STUDENT_CLEVERID}@test.invalid`, firstName: 'A13', lastName: '02Stu', role: 'STUDENT' },
    update: {},
    select: { id: true },
  })
  studentUserId = sUser.id
  await prisma.student.upsert({ where: { userId: studentUserId }, create: { userId: studentUserId }, update: {}, select: { id: true } })
})

afterAll(async () => {
  const student = await prisma.student.findUnique({ where: { userId: studentUserId }, select: { id: true } })
  if (student) await prisma.eocActualScore.deleteMany({ where: { studentId: student.id } })
  await prisma.auditLog.deleteMany({ where: { actorUserId: adminUserId } })
  await prisma.student.deleteMany({ where: { userId: studentUserId } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [ADMIN_CLEVERID, STUDENT_CLEVERID] } } })
  await prisma.$disconnect()
})

describe('Audit 13 — Item 2: consent gate on score import', () => {
  it('2a. rejects a row without consent (NO_CONSENT)', async () => {
    expect.assertions(2)
    try {
      await importEocScore(adminUserId, {
        studentExternalKey: STUDENT_CLEVERID,
        schoolYear: SCHOOL_YEAR,
        scaledScore: 350,
        achievementLevel: 3,
        consentAcknowledged: false,
      })
    } catch (err) {
      expect(err).toBeInstanceOf(ScoreImportError)
      expect((err as ScoreImportError).code).toBe('NO_CONSENT')
    }
  })

  it('2b. accepts the same row once consent is acknowledged', async () => {
    const result = await importEocScore(adminUserId, {
      studentExternalKey: STUDENT_CLEVERID,
      schoolYear: SCHOOL_YEAR,
      scaledScore: 350,
      achievementLevel: 3,
      consentAcknowledged: true,
    })
    expect(result.id).toBeTruthy()
    expect(result.auditLogId).toBeTruthy()
  })
})
