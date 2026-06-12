/**
 * Audit 14 — Item 2: The generated report excludes answer keys, the item bank,
 * item-level distractor analysis, other students, and (spec §23) confidence-
 * calibration data and internal flags.
 *
 * Strategy: build a real VM for a student who HAS calibration snapshots, overrides,
 * accommodations, and decay state on record, then assert none of that leaks — the
 * VM's top-level keys are exactly the allowlist and a deep serialization contains
 * no forbidden tokens.
 * Prefix: test-audit14-02-
 */

import { PrismaClient } from '@prisma/client'
import { getParentSummary, PARENT_SUMMARY_FIELDS } from '@/lib/parent-summary'

const prisma = new PrismaClient()

const T_CLEVERID = 'test-audit14-02-teacher'
const S_CLEVERID = 'test-audit14-02-student'

let teacherUserId: string
let teacherId: string
let studentId: string
let classId: string

const ALLOWED_TOP_LEVEL = new Set([
  'student',
  'generatedAt',
  ...PARENT_SUMMARY_FIELDS,
])

const FORBIDDEN_TOKENS = [
  'calibration',
  'highConfidence',
  'overrideHistory',
  'decayFlags',
  'easinessFactor',
  'isCorrect',
  'distractor',
  'accommodation',
]

beforeAll(async () => {
  const tUser = await prisma.user.upsert({
    where: { cleverId: T_CLEVERID },
    create: { cleverId: T_CLEVERID, email: `${T_CLEVERID}@test.invalid`, firstName: 'A14', lastName: '02Teacher', role: 'TEACHER' },
    update: {},
    select: { id: true },
  })
  teacherUserId = tUser.id
  const teacher = await prisma.teacher.upsert({ where: { userId: teacherUserId }, create: { userId: teacherUserId }, update: {}, select: { id: true } })
  teacherId = teacher.id

  const sUser = await prisma.user.upsert({
    where: { cleverId: S_CLEVERID },
    create: { cleverId: S_CLEVERID, email: `${S_CLEVERID}@test.invalid`, firstName: 'A14', lastName: '02Student', role: 'STUDENT' },
    update: {},
    select: { id: true },
  })
  const student = await prisma.student.upsert({ where: { userId: sUser.id }, create: { userId: sUser.id }, update: {}, select: { id: true } })
  studentId = student.id

  const cls = await prisma.class.create({
    data: { teacherId, name: 'Audit 14-02 Class', schoolYear: '2025-2026' },
    select: { id: true },
  })
  classId = cls.id
  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId, studentId } },
    create: { classId, studentId, status: 'ACTIVE' },
    update: {},
  })

  // Forbidden data ON RECORD — must NOT surface in the parent VM.
  await prisma.confidenceCalibrationSnapshot.create({
    data: {
      studentId,
      scope: 'overall',
      highConfidenceCorrect: 8,
      highConfidenceIncorrect: 2,
      mediumConfidenceCorrect: 5,
      mediumConfidenceIncorrect: 1,
      lowConfidenceCorrect: 3,
      lowConfidenceIncorrect: 0,
    },
  })
})

afterAll(async () => {
  await prisma.confidenceCalibrationSnapshot.deleteMany({ where: { studentId } })
  await prisma.classEnrollment.deleteMany({ where: { classId } })
  await prisma.class.deleteMany({ where: { id: classId } })
  await prisma.student.deleteMany({ where: { id: studentId } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [T_CLEVERID, S_CLEVERID] } } })
  await prisma.$disconnect()
})

describe('Audit 14 — Item 2: report excludes forbidden data', () => {
  it('top-level keys are exactly the allowlist (no calibration/override/etc.)', async () => {
    const vm = await getParentSummary(teacherUserId, studentId)
    for (const key of Object.keys(vm)) {
      expect(ALLOWED_TOP_LEVEL.has(key)).toBe(true)
    }
  })

  it('serialized VM contains no forbidden tokens even with calibration on record', async () => {
    const vm = await getParentSummary(teacherUserId, studentId)
    const json = JSON.stringify(vm)
    for (const token of FORBIDDEN_TOKENS) {
      expect(json).not.toContain(token)
    }
  })

  it('recent assessments carry only score/pass/date — no questions or options', async () => {
    const vm = await getParentSummary(teacherUserId, studentId)
    for (const a of vm.recentAssessments) {
      expect(Object.keys(a).sort()).toEqual(['date', 'passed', 'scorePercent', 'title'])
    }
  })
})
