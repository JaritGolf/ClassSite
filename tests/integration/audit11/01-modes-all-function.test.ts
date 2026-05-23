/**
 * Audit 11 — Item 1: Every review mode (spec §30.2) functions.
 *
 * Creates a Republic Challenge session for each of the seven modes and
 * verifies the resulting Assessment row matches expectations.
 *
 * Prefix: test-audit11-01-
 */

import { PrismaClient } from '@prisma/client'
import {
  createRepublicChallengeSession,
  type Mode,
} from '@/lib/republic-challenge'

const prisma = new PrismaClient()

let studentId: string
let studentUserId: string
let categoryId: string

beforeAll(async () => {
  const u = await prisma.user.upsert({
    where: { cleverId: 'test-audit11-01-s1' },
    create: {
      cleverId: 'test-audit11-01-s1',
      firstName: 'Audit11',
      lastName: '01',
      role: 'STUDENT',
      status: 'ACTIVE',
    },
    update: {},
  })
  studentUserId = u.id
  const s = await prisma.student.upsert({
    where: { userId: u.id },
    update: {},
    create: { userId: u.id },
  })
  studentId = s.id

  const cat = await prisma.reportingCategory.findFirst({
    where: { questions: { some: { active: true, approvalStatus: 'APPROVED' } } },
    select: { id: true },
  })
  categoryId = cat!.id

  // Seed a missed AttemptResponse so MISTAKE_REPLAY has a pool to draw from.
  const seedQuestion = await prisma.question.findFirst({
    where: { active: true, approvalStatus: 'APPROVED' },
    select: { id: true, benchmarkId: true, options: { select: { id: true }, take: 1 } },
  })
  if (seedQuestion) {
    const seedAssessment = await prisma.assessment.create({
      data: {
        benchmarkId: seedQuestion.benchmarkId,
        title: 'audit11-01 seed',
        assessmentType: 'PRACTICE',
        approvalStatus: 'APPROVED',
      },
    })
    const seedAttempt = await prisma.assessmentAttempt.create({
      data: {
        assessmentId: seedAssessment.id,
        studentId,
        attemptNumber: 1,
        submittedAt: new Date(),
        score: 0,
        passed: false,
      },
    })
    await prisma.attemptResponse.create({
      data: {
        attemptId: seedAttempt.id,
        questionId: seedQuestion.id,
        responseJson: { selectedOptionId: seedQuestion.options[0].id },
        selectedOptionId: seedQuestion.options[0].id,
        isCorrect: false,
        pointsAwarded: 0,
      },
    })
  }
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { metadataJson: { path: ['studentId'], equals: studentId } },
        { action: 'RC_SESSION_STARTED', actorUserId: studentUserId },
      ],
    },
  })
  await prisma.attemptResponse.deleteMany({ where: { attempt: { studentId } } })
  await prisma.assessmentAttempt.deleteMany({ where: { studentId } })
  // Drop ephemeral Republic Challenge Assessments + the seed PRACTICE assessment.
  const ephemeral = await prisma.assessment.findMany({
    where: {
      OR: [
        { benchmarkId: null, mode: { not: null } },
        { title: 'audit11-01 seed' },
      ],
    },
    select: { id: true },
  })
  if (ephemeral.length > 0) {
    const ids = ephemeral.map((a) => a.id)
    await prisma.assessmentQuestion.deleteMany({ where: { assessmentId: { in: ids } } })
    await prisma.assessment.deleteMany({ where: { id: { in: ids } } })
  }
  await prisma.student.deleteMany({
    where: { user: { cleverId: { startsWith: 'test-audit11-01-' } } },
  })
  await prisma.user.deleteMany({
    where: { cleverId: { startsWith: 'test-audit11-01-' } },
  })
  await prisma.$disconnect()
})

const MODES: Array<{
  mode: Mode
  expectedAssessmentType: 'REPUBLIC_CHALLENGE' | 'FINAL_TRIAL'
  extra?: { reportingCategoryId?: string; stimulusType?: string }
}> = [
  { mode: 'QUICK_REVIEW', expectedAssessmentType: 'REPUBLIC_CHALLENGE' },
  { mode: 'MIXED_MISSION', expectedAssessmentType: 'REPUBLIC_CHALLENGE' },
  { mode: 'MISTAKE_REPLAY', expectedAssessmentType: 'REPUBLIC_CHALLENGE' },
  { mode: 'SOURCE_SPRINT', expectedAssessmentType: 'REPUBLIC_CHALLENGE', extra: { stimulusType: 'EXCERPT' } },
  { mode: 'ENDURANCE_TRIAL', expectedAssessmentType: 'REPUBLIC_CHALLENGE' },
  { mode: 'FINAL_REPUBLIC_TRIAL', expectedAssessmentType: 'FINAL_TRIAL' },
]

describe('Audit 11 item 1 — all 7 review modes function', () => {
  for (const spec of MODES) {
    it(`mode ${spec.mode} produces a usable session`, async () => {
      const result = await createRepublicChallengeSession({
        studentId,
        mode: spec.mode,
        length: spec.mode === 'FINAL_REPUBLIC_TRIAL' ? 10 : 4,
        actorUserId: studentUserId,
        ...spec.extra,
      })
      expect(result.assessmentType).toBe(spec.expectedAssessmentType)
      const a = await prisma.assessment.findUnique({
        where: { id: result.assessmentId },
        select: { mode: true, benchmarkId: true, assessmentType: true, approvalStatus: true },
      })
      expect(a?.mode).toBe(spec.mode)
      expect(a?.benchmarkId).toBeNull()
      expect(a?.assessmentType).toBe(spec.expectedAssessmentType)
      expect(a?.approvalStatus).toBe('APPROVED')
      // Mode must also include CATEGORY_CHALLENGE — covered separately below.
    })
  }

  it('mode CATEGORY_CHALLENGE produces a session', async () => {
    const result = await createRepublicChallengeSession({
      studentId,
      mode: 'CATEGORY_CHALLENGE',
      reportingCategoryId: categoryId,
      length: 4,
      actorUserId: studentUserId,
    })
    const a = await prisma.assessment.findUnique({
      where: { id: result.assessmentId },
      select: { mode: true },
    })
    expect(a?.mode).toBe('CATEGORY_CHALLENGE')
  })
})
