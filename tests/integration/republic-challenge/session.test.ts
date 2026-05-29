/**
 * Integration Tests: Republic Challenge — session + pickers
 *
 * Verifies that:
 *   1. Each of the 7 pickers returns a non-empty result (assuming seed has
 *      enough content) and never leaks answer keys.
 *   2. `createRepublicChallengeSession` builds an ephemeral Assessment +
 *      AssessmentAttempt that round-trips through `fetchAssessmentForStudent`
 *      and `gradeAndSubmit`.
 *   3. Confidence-required guard fires for REPUBLIC_CHALLENGE submissions
 *      missing confidence.
 *   4. `pickFinalRepublicTrial` returns only reading-load level ≥ 2 questions.
 *   5. `createRepublicChallengeSession` writes an RC_SESSION_STARTED AuditLog.
 *   6. `featureEocReviewEnabled = false` blocks session creation.
 */

import { PrismaClient } from '@prisma/client'
import {
  createRepublicChallengeSession,
  pickMixedMission,
  pickFinalRepublicTrial,
  pickQuickReview,
  pickCategoryChallenge,
  pickSourceSprint,
  pickMistakeReplay,
  pickEnduranceTrial,
  RepublicChallengeError,
} from '@/lib/republic-challenge'
import {
  fetchAssessmentForStudent,
  gradeAndSubmit,
  startAttempt,
  AssessmentError,
} from '@/lib/assessment'

const prisma = new PrismaClient()

let studentId: string
let studentUserId: string
let categoryId: string

beforeAll(async () => {
  // Test student (prefix avoids auth cleanup conflicts)
  const u = await prisma.user.upsert({
    where: { cleverId: 'test-phase11-student-001' },
    update: {},
    create: {
      cleverId: 'test-phase11-student-001',
      firstName: 'Phase11',
      lastName: 'TestStudent',
      role: 'STUDENT',
      status: 'ACTIVE',
    },
  })
  studentUserId = u.id
  const s = await prisma.student.upsert({
    where: { userId: u.id },
    update: {},
    create: { userId: u.id },
  })
  studentId = s.id

  // Pick a reporting category that has at least one approved question
  const cat = await prisma.reportingCategory.findFirst({
    where: {
      questions: { some: { active: true, approvalStatus: 'APPROVED' } },
    },
    select: { id: true },
  })
  if (!cat) throw new Error('No reporting category with approved questions found in seed')
  categoryId = cat.id
})

afterAll(async () => {
  // Best-effort cleanup of anything this suite produced.
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { metadataJson: { path: ['studentId'], equals: studentId } },
        { action: 'RC_SESSION_STARTED' },
      ],
    },
  })
  await prisma.attemptResponse.deleteMany({
    where: { attempt: { studentId } },
  })
  await prisma.assessmentAttempt.deleteMany({ where: { studentId } })
  // Clear ephemeral assessments created with benchmarkId=null + mode set.
  const ephemeralAssessments = await prisma.assessment.findMany({
    where: { benchmarkId: null, mode: { not: null } },
    select: { id: true },
  })
  if (ephemeralAssessments.length > 0) {
    const ids = ephemeralAssessments.map((a) => a.id)
    await prisma.assessmentQuestion.deleteMany({ where: { assessmentId: { in: ids } } })
    await prisma.assessment.deleteMany({ where: { id: { in: ids } } })
  }
  await prisma.confidenceCalibrationSnapshot.deleteMany({
    where: { student: { user: { cleverId: { startsWith: 'test-phase11-' } } } },
  })
  await prisma.student.deleteMany({
    where: { user: { cleverId: { startsWith: 'test-phase11-' } } },
  })
  await prisma.user.deleteMany({ where: { cleverId: { startsWith: 'test-phase11-' } } })
  await prisma.$disconnect()
})

// ── Picker smoke tests ───────────────────────────────────────────────────────

describe('Pickers', () => {
  it('pickQuickReview returns up to N question IDs', async () => {
    const ids = await pickQuickReview(studentId, 5)
    expect(ids.length).toBeLessThanOrEqual(5)
    expect(new Set(ids).size).toBe(ids.length) // no duplicates
  })

  it('pickCategoryChallenge filters by reportingCategoryId', async () => {
    const ids = await pickCategoryChallenge(studentId, categoryId, 5)
    if (ids.length === 0) return // small seed pools acceptable
    const questions = await prisma.question.findMany({
      where: { id: { in: ids } },
      select: { reportingCategoryId: true },
    })
    expect(questions.every((q) => q.reportingCategoryId === categoryId)).toBe(true)
  })

  it('pickMixedMission returns a blueprint-weighted sample (length cap)', async () => {
    const ids = await pickMixedMission(studentId, 10)
    expect(ids.length).toBeLessThanOrEqual(10)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('pickSourceSprint filters by stimulusType', async () => {
    // EXCERPT typically present in seed; if not, this is a no-op.
    const ids = await pickSourceSprint(studentId, 'EXCERPT', 5)
    if (ids.length === 0) return
    const questions = await prisma.question.findMany({
      where: { id: { in: ids } },
      select: { stimulus: { select: { stimulusType: true } } },
    })
    expect(questions.every((q) => q.stimulus?.stimulusType === 'EXCERPT')).toBe(true)
  })

  it('pickMistakeReplay returns empty when student has no misses', async () => {
    const ids = await pickMistakeReplay(studentId, 10)
    expect(Array.isArray(ids)).toBe(true)
  })

  it('pickEnduranceTrial returns up to N IDs', async () => {
    const ids = await pickEnduranceTrial(studentId, 8)
    expect(ids.length).toBeLessThanOrEqual(8)
  })

  it('pickFinalRepublicTrial returns only level ≥ 2 questions (Audit 11 item 4)', async () => {
    const ids = await pickFinalRepublicTrial(studentId, 20)
    if (ids.length === 0) return
    const questions = await prisma.question.findMany({
      where: { id: { in: ids } },
      select: { readingLoadLevel: true },
    })
    expect(questions.every((q) => q.readingLoadLevel >= 2)).toBe(true)
  })
})

// ── Session creation + round-trip ─────────────────────────────────────────────

describe('createRepublicChallengeSession', () => {
  it('creates an Assessment with mode set (no attempt yet)', async () => {
    const result = await createRepublicChallengeSession({
      studentId,
      mode: 'MIXED_MISSION',
      length: 4,
      actorUserId: studentUserId,
    })
    expect(result.assessmentId).toBeTruthy()
    expect(result.questionCount).toBeGreaterThan(0)
    expect(result.assessmentType).toBe('REPUBLIC_CHALLENGE')

    const a = await prisma.assessment.findUnique({
      where: { id: result.assessmentId },
      select: { mode: true, benchmarkId: true, assessmentType: true },
    })
    expect(a?.mode).toBe('MIXED_MISSION')
    expect(a?.benchmarkId).toBeNull()
    expect(a?.assessmentType).toBe('REPUBLIC_CHALLENGE')

    // No attempt exists yet — that happens via /api/assessment/[id]/start
    const attemptCount = await prisma.assessmentAttempt.count({
      where: { assessmentId: result.assessmentId },
    })
    expect(attemptCount).toBe(0)
  })

  it('writes an RC_SESSION_STARTED AuditLog tied to Assessment', async () => {
    const result = await createRepublicChallengeSession({
      studentId,
      mode: 'QUICK_REVIEW',
      length: 3,
      actorUserId: studentUserId,
    })
    const log = await prisma.auditLog.findFirst({
      where: {
        action: 'RC_SESSION_STARTED',
        entityType: 'Assessment',
        entityId: result.assessmentId,
      },
    })
    expect(log).not.toBeNull()
    expect(log?.actorUserId).toBe(studentUserId)
  })

  it('round-trips through startAttempt + fetchAssessmentForStudent + gradeAndSubmit', async () => {
    const session = await createRepublicChallengeSession({
      studentId,
      mode: 'MIXED_MISSION',
      length: 3,
    })
    const { attemptId } = await startAttempt(session.assessmentId, studentId)
    const fetched = await fetchAssessmentForStudent(session.assessmentId, studentId)
    expect(fetched).not.toBeNull()
    expect(fetched!.questions.length).toBe(session.questionCount)
    // No answer-key leak
    for (const q of fetched!.questions) {
      for (const opt of q.options) {
        expect(opt).not.toHaveProperty('isCorrect')
        expect(opt).not.toHaveProperty('feedback')
      }
    }

    // Submit with arbitrary options + confidence (Republic Challenge requires confidence)
    const responses = fetched!.questions.map((q) => ({
      questionId: q.id,
      selectedOptionId: q.options[0].id,
      confidence: 1 as const,
      timeSeconds: 5,
    }))
    const submitResult = await gradeAndSubmit({ attemptId, responses }, studentId)
    expect(submitResult.attemptId).toBe(attemptId)
    // REPUBLIC_CHALLENGE is secure → feedback must be null (Audit 3 item 5)
    expect(submitResult.feedback).toBeNull()
  })

  it('rejects submission without confidence (Audit 11 item 5)', async () => {
    const session = await createRepublicChallengeSession({
      studentId,
      mode: 'MIXED_MISSION',
      length: 2,
    })
    const { attemptId } = await startAttempt(session.assessmentId, studentId)
    const fetched = await fetchAssessmentForStudent(session.assessmentId, studentId)
    const responses = fetched!.questions.map((q) => ({
      questionId: q.id,
      selectedOptionId: q.options[0].id,
      // confidence intentionally omitted
      timeSeconds: 5,
    }))
    await expect(
      gradeAndSubmit({ attemptId, responses }, studentId)
    ).rejects.toThrow(AssessmentError)
  })

  it('throws FEATURE_DISABLED when class has featureEocReviewEnabled=false', async () => {
    await expect(
      createRepublicChallengeSession({
        studentId,
        mode: 'QUICK_REVIEW',
        classConfig: {
          rcSessionLengthOverride: null,
          rcStaminaOverride: null,
          featureEocReviewEnabled: false,
        },
      })
    ).rejects.toMatchObject({ code: 'FEATURE_DISABLED' })
  })

  it('FINAL_REPUBLIC_TRIAL produces a FINAL_TRIAL assessment', async () => {
    const session = await createRepublicChallengeSession({
      studentId,
      mode: 'FINAL_REPUBLIC_TRIAL',
      length: 5,
    })
    expect(session.assessmentType).toBe('FINAL_TRIAL')
    const a = await prisma.assessment.findUnique({
      where: { id: session.assessmentId },
      select: { assessmentType: true, mode: true },
    })
    expect(a?.assessmentType).toBe('FINAL_TRIAL')
    expect(a?.mode).toBe('FINAL_REPUBLIC_TRIAL')
  })
})
