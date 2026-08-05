/**
 * Audit 18 — Item 3 (depth): the parent-scoped VM contains only allowlist fields
 * and no answer-key / item-level / calibration data, even serialized deep.
 * Prefix: test-audit18-03-
 */

import { PrismaClient } from '@prisma/client'
import { seedReportingCategories } from '../../../seed/reporting_categories'
import { seedBenchmarks } from '../../../seed/benchmarks'
import {
  createParentAccount,
  linkParentToStudent,
  setLinkVerification,
  getParentSummaryForParent,
} from '@/lib/parent-portal'

const prisma = new PrismaClient()

const ADMIN = 'test-audit18-03-admin'
const STUDENT = 'test-audit18-03-student'
const PARENT_EMAIL = 'test-audit18-03-parent@test.invalid'

const ALLOWED_KEYS = [
  'student',
  'generatedAt',
  'currentMission',
  'mastery',
  'remediation',
  'recentAssessments',
  'eocReadiness',
  'suggestedReview',
  'positiveIndicators',
  // Nine-week checkpoint Levels (ADR 0019). Level only — no grade vocabulary, no
  // per-mission off-ramp detail, no comparison to other students.
  'progressCheckpoints',
]

const FORBIDDEN_TOKENS = [
  'isCorrect',
  'is_correct',
  'pointsAwarded',
  'distractor',
  'misconception',
  'calibration',
  'overconfiden',
  'decay',
  'override',
  'accommodation',
  'answerKey',
  'selectedOption',
]

let adminUserId: string
let studentId: string
let parentUserId: string
let parentId: string

beforeAll(async () => {
  process.env.FEATURE_PARENT_PORTAL = 'true'
  await seedReportingCategories(prisma)
  await seedBenchmarks(prisma)

  const admin = await prisma.user.upsert({
    where: { cleverId: ADMIN },
    create: { cleverId: ADMIN, email: `${ADMIN}@test.invalid`, firstName: 'A18', lastName: 'Admin', role: 'ADMIN' },
    update: {},
    select: { id: true },
  })
  adminUserId = admin.id

  const u = await prisma.user.upsert({
    where: { cleverId: STUDENT },
    create: { cleverId: STUDENT, email: `${STUDENT}@test.invalid`, firstName: 'A18', lastName: 'Student', role: 'STUDENT' },
    update: {},
    select: { id: true },
  })
  const s = await prisma.student.upsert({
    where: { userId: u.id },
    create: { userId: u.id, gradeLevel: 7 },
    update: {},
    select: { id: true },
  })
  studentId = s.id

  const parent = await createParentAccount(adminUserId, {
    email: PARENT_EMAIL,
    firstName: 'Pat',
    lastName: 'Parent',
  })
  parentId = parent.parentId
  parentUserId = parent.userId
  const { linkId } = await linkParentToStudent(adminUserId, parentId, studentId, 'guardian')
  await setLinkVerification(adminUserId, linkId, 'VERIFIED')
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { actorUserId: adminUserId } })
  await prisma.parentStudentLink.deleteMany({ where: { parentId } })
  await prisma.parent.deleteMany({ where: { id: parentId } })
  await prisma.student.deleteMany({ where: { id: studentId } })
  await prisma.user.deleteMany({ where: { email: PARENT_EMAIL } })
  await prisma.user.deleteMany({ where: { cleverId: { in: [ADMIN, STUDENT] } } })
  await prisma.$disconnect()
})

describe('Audit 18 — Item 3: allowlist VM', () => {
  it('exposes only allowlist top-level keys', async () => {
    const vm = await getParentSummaryForParent(parentUserId, studentId)
    for (const key of Object.keys(vm)) {
      expect(ALLOWED_KEYS).toContain(key)
    }
  })

  it('has no forbidden tokens when deep-serialized', async () => {
    const vm = await getParentSummaryForParent(parentUserId, studentId)
    const blob = JSON.stringify(vm).toLowerCase()
    for (const token of FORBIDDEN_TOKENS) {
      expect(blob).not.toContain(token.toLowerCase())
    }
  })
})
