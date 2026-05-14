/**
 * Integration Tests — Reading-Load Ladder (Phase 7)
 *
 * Tests accommodation DB functions, effective reading level resolution,
 * stimulus variant delivery, and Mastery Challenge level-2 enforcement.
 *
 * Uses real DB (requires DATABASE_URL in env).
 * Prefix: test-phase7- (avoids collision with auth cleanup and other phases).
 */

import { prisma } from '@/lib/db'
import {
  getStudentAccommodations,
  getEffectiveReadingLevel,
  setAccommodation,
  AccommodationError,
  fetchStimulusForQuestion,
} from '@/lib/reading-load'
import { gradeAndSubmit } from '@/lib/assessment'

// ── Test data IDs (filled in beforeAll) ────────────────────────────────────

let teacherUserId: string
let studentId: string
let stimulusId: string
let questionWithStimId: string
let questionWithoutStimId: string
let masteryAssessmentId: string
let masteryAttemptId: string

// Accommodation IDs
let accSimpleLangId: string
let accEllId: string

const TEACHER_CLEVERID = 'test-phase7-teacher-001'
const STUDENT_CLEVERID = 'test-phase7-student-001'

// ── Setup ──────────────────────────────────────────────────────────────────

beforeAll(async () => {
  // Ensure accommodation records exist (upsert by code)
  const accSimpleLang = await prisma.accommodation.upsert({
    where: { code: 'ACC-SIMPLE-LANG' },
    create: {
      code: 'ACC-SIMPLE-LANG',
      name: 'Simplified Language',
      description: 'Defaults to reading-load level 1.',
    },
    update: {},
    select: { id: true },
  })
  accSimpleLangId = accSimpleLang.id

  const accEll = await prisma.accommodation.upsert({
    where: { code: 'ELL' },
    create: {
      code: 'ELL',
      name: 'English Language Learner',
      description: 'Defaults to reading-load level 1.',
    },
    update: {},
    select: { id: true },
  })
  accEllId = accEll.id

  await prisma.accommodation.upsert({
    where: { code: 'BELOW-GRADE-READER' },
    create: {
      code: 'BELOW-GRADE-READER',
      name: 'Below-Grade Reader',
      description: 'Defaults to reading-load level 1.',
    },
    update: {},
  })

  // ── Create Teacher ────────────────────────────────────────────────────
  const teacherUser = await prisma.user.upsert({
    where: { cleverId: TEACHER_CLEVERID },
    create: {
      cleverId: TEACHER_CLEVERID,
      email: `${TEACHER_CLEVERID}@test.invalid`,
      firstName: 'Phase7', lastName: 'Teacher',
      role: 'TEACHER',
    },
    update: {},
    select: { id: true },
  })
  teacherUserId = teacherUser.id

  await prisma.teacher.upsert({
    where: { userId: teacherUserId },
    create: { userId: teacherUserId, schoolId: 'test-school-phase7' },
    update: {},
  })

  // ── Create Student ────────────────────────────────────────────────────
  const studentUser = await prisma.user.upsert({
    where: { cleverId: STUDENT_CLEVERID },
    create: {
      cleverId: STUDENT_CLEVERID,
      email: `${STUDENT_CLEVERID}@test.invalid`,
      firstName: 'Phase7', lastName: 'Student',
      role: 'STUDENT',
    },
    update: {},
    select: { id: true },
  })

  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    create: { userId: studentUser.id, gradeLevel: 7 },
    update: {},
    select: { id: true },
  })
  studentId = student.id

  // ── Create Stimulus with variants ─────────────────────────────────────
  const existingStimulus = await prisma.stimulus.findFirst({
    where: { title: '[TEST-P7] Natural Rights Passage' },
    select: { id: true },
  })

  if (existingStimulus) {
    stimulusId = existingStimulus.id
  } else {
    const stim = await prisma.stimulus.create({
      data: {
        title: '[TEST-P7] Natural Rights Passage',
        stimulusType: 'EXCERPT',
        content: 'Raw passage about natural rights — level 3.',
        readingLoadLevel: 3,
        approvalStatus: 'APPROVED',
      },
      select: { id: true },
    })
    stimulusId = stim.id

    // Create level-1 and level-2 variants
    await prisma.stimulusVariant.upsert({
      where: { stimulusId_readingLoadLevel: { stimulusId, readingLoadLevel: 1 } },
      create: { stimulusId, readingLoadLevel: 1, content: 'Level 1: Simple paraphrase.', approvalStatus: 'APPROVED' },
      update: { content: 'Level 1: Simple paraphrase.' },
    })
    await prisma.stimulusVariant.upsert({
      where: { stimulusId_readingLoadLevel: { stimulusId, readingLoadLevel: 2 } },
      create: { stimulusId, readingLoadLevel: 2, content: 'Level 2: Chunked excerpt.', approvalStatus: 'APPROVED' },
      update: { content: 'Level 2: Chunked excerpt.' },
    })
  }

  // ── Find a real benchmark and reporting category for test questions ────
  const benchmark = await prisma.benchmark.findFirst({
    where: { code: 'SS.7.CG.1.1' },
    select: { id: true },
  })
  const reportingCategory = await prisma.reportingCategory.findFirst({
    select: { id: true },
  })

  if (!benchmark || !reportingCategory) {
    throw new Error('Seed data not found — run db:seed before integration tests')
  }

  // ── Create a question WITH stimulus ───────────────────────────────────
  const qWithStim = await prisma.question.create({
    data: {
      benchmarkId: benchmark.id,
      reportingCategoryId: reportingCategory.id,
      prompt: '[TEST-P7] Which principle is described in the passage?',
      itemType: 'MULTIPLE_CHOICE',
      cognitiveComplexity: 'MODERATE',
      readingLoadLevel: 2,
      skillTag: 'test-p7-skill',
      remediationTag: 'test-p7-remediation',
      approvalStatus: 'APPROVED',
      sourceTier: 'B',
      stimulusId,
      options: {
        create: [
          { optionText: 'Natural rights', isCorrect: true },
          { optionText: 'Federalism', isCorrect: false },
        ],
      },
    },
    select: { id: true },
  })
  questionWithStimId = qWithStim.id

  // ── Create a question WITHOUT stimulus ────────────────────────────────
  const qNoStim = await prisma.question.create({
    data: {
      benchmarkId: benchmark.id,
      reportingCategoryId: reportingCategory.id,
      prompt: '[TEST-P7] No stimulus question.',
      itemType: 'MULTIPLE_CHOICE',
      cognitiveComplexity: 'LOW',
      readingLoadLevel: 2,
      skillTag: 'test-p7-skill',
      remediationTag: 'test-p7-remediation',
      approvalStatus: 'APPROVED',
      sourceTier: 'B',
      options: {
        create: [
          { optionText: 'Option A', isCorrect: true },
          { optionText: 'Option B', isCorrect: false },
        ],
      },
    },
    select: { id: true },
  })
  questionWithoutStimId = qNoStim.id

  // ── Create a LEVEL-1 question for mastery enforcement test ─────────────
  const level1Question = await prisma.question.create({
    data: {
      benchmarkId: benchmark.id,
      reportingCategoryId: reportingCategory.id,
      prompt: '[TEST-P7] Level-1 question (should fail mastery check).',
      itemType: 'MULTIPLE_CHOICE',
      cognitiveComplexity: 'LOW',
      readingLoadLevel: 1, // ← below level 2
      skillTag: 'test-p7-skill',
      remediationTag: 'test-p7-remediation',
      approvalStatus: 'APPROVED',
      sourceTier: 'B',
      options: {
        create: [
          { optionText: 'Correct', isCorrect: true },
          { optionText: 'Wrong', isCorrect: false },
        ],
      },
    },
    select: { id: true, options: { select: { id: true, isCorrect: true } } },
  })

  // ── Create MASTERY_CHALLENGE assessment with a level-1 question ────────
  const masteryAssessment = await prisma.assessment.create({
    data: {
      benchmarkId: benchmark.id,
      title: '[TEST-P7] Mastery Challenge — level-1 question included',
      assessmentType: 'MASTERY_CHALLENGE',
      masteryThreshold: 0.8,
      approvalStatus: 'APPROVED',
      questions: {
        create: [
          { questionId: level1Question.id, sequenceOrder: 1, points: 1 },
        ],
      },
    },
    select: { id: true },
  })
  masteryAssessmentId = masteryAssessment.id

  // Create an attempt for the mastery test
  const masteryAttempt = await prisma.assessmentAttempt.create({
    data: {
      assessmentId: masteryAssessmentId,
      studentId,
      attemptNumber: 1,
    },
    select: { id: true },
  })
  masteryAttemptId = masteryAttempt.id
})

// ── Cleanup ────────────────────────────────────────────────────────────────

afterAll(async () => {
  // Remove StudentAccommodation records
  await prisma.studentAccommodation.deleteMany({
    where: { studentId },
  })

  // Remove mastery attempt
  await prisma.attemptResponse.deleteMany({ where: { attemptId: masteryAttemptId } })
  await prisma.assessmentAttempt.deleteMany({ where: { id: masteryAttemptId } })
  await prisma.assessmentQuestion.deleteMany({ where: { assessmentId: masteryAssessmentId } })
  await prisma.assessment.deleteMany({ where: { id: masteryAssessmentId } })

  // Remove test questions
  await prisma.questionOption.deleteMany({
    where: { questionId: { in: [questionWithStimId, questionWithoutStimId] } },
  })
  await prisma.question.deleteMany({
    where: {
      skillTag: 'test-p7-skill',
      prompt: { contains: '[TEST-P7]' },
    },
  })

  // Remove test stimulus and variants (cascade)
  await prisma.stimulusVariant.deleteMany({ where: { stimulusId } })
  await prisma.stimulus.deleteMany({ where: { id: stimulusId } })

  // Remove test users
  await prisma.teacher.deleteMany({ where: { userId: teacherUserId } })
  await prisma.student.deleteMany({ where: { userId: studentId } })
  await prisma.user.deleteMany({
    where: { cleverId: { in: [TEACHER_CLEVERID, STUDENT_CLEVERID] } },
  })

  await prisma.$disconnect()
})

// ── Accommodation tests ────────────────────────────────────────────────────

describe('getStudentAccommodations', () => {
  it('returns empty array for student with no accommodations', async () => {
    const result = await getStudentAccommodations(studentId)
    const p7accs = result.filter((a) =>
      ['ACC-SIMPLE-LANG', 'ELL', 'BELOW-GRADE-READER'].includes(a.code)
    )
    expect(p7accs.length).toBe(0)
  })
})

describe('setAccommodation', () => {
  it('creates a StudentAccommodation record (ACC-SIMPLE-LANG)', async () => {
    const result = await setAccommodation(teacherUserId, studentId, 'ACC-SIMPLE-LANG', true)
    expect(result.accommodationCode).toBe('ACC-SIMPLE-LANG')
    expect(result.active).toBe(true)
    expect(typeof result.studentAccommodationId).toBe('string')
  })

  it('is idempotent — calling twice does not throw', async () => {
    await expect(
      setAccommodation(teacherUserId, studentId, 'ACC-SIMPLE-LANG', true)
    ).resolves.not.toThrow()
  })

  it('can deactivate an accommodation (active: false)', async () => {
    const result = await setAccommodation(teacherUserId, studentId, 'ACC-SIMPLE-LANG', false)
    expect(result.active).toBe(false)
  })

  it('throws FORBIDDEN for a non-teacher userId', async () => {
    // Use the student's userId (not a teacher)
    const studentUser = await prisma.user.findFirst({
      where: { cleverId: STUDENT_CLEVERID },
      select: { id: true },
    })
    await expect(
      setAccommodation(studentUser!.id, studentId, 'ACC-SIMPLE-LANG', true)
    ).rejects.toThrow(AccommodationError)

    try {
      await setAccommodation(studentUser!.id, studentId, 'ACC-SIMPLE-LANG', true)
    } catch (err) {
      expect(err instanceof AccommodationError && err.code).toBe('FORBIDDEN')
    }
  })

  it('throws INVALID_CODE for an unrecognized accommodation code', async () => {
    try {
      await setAccommodation(teacherUserId, studentId, 'TOTALLY-FAKE-CODE', true)
      fail('Expected AccommodationError to be thrown')
    } catch (err) {
      expect(err instanceof AccommodationError && err.code).toBe('INVALID_CODE')
    }
  })
})

describe('getStudentAccommodations (after creation)', () => {
  beforeAll(async () => {
    // Re-activate ACC-SIMPLE-LANG for the remaining tests
    await setAccommodation(teacherUserId, studentId, 'ACC-SIMPLE-LANG', true)
  })

  it('returns the created accommodation with correct fields', async () => {
    const result = await getStudentAccommodations(studentId)
    const acc = result.find((a) => a.code === 'ACC-SIMPLE-LANG')
    expect(acc).toBeDefined()
    expect(acc?.active).toBe(true)
    expect(acc?.name).toBe('Simplified Language')
    expect(acc?.grantedAt).toBeInstanceOf(Date)
  })
})

// ── getEffectiveReadingLevel ───────────────────────────────────────────────

describe('getEffectiveReadingLevel', () => {
  it('returns requestedLevel when no accommodation active (fresh student — before any acc set)', async () => {
    // Create a fresh student with no accommodations
    const freshUser = await prisma.user.create({
      data: {
        cleverId: 'test-phase7-student-fresh',
        email: 'test-phase7-student-fresh@test.invalid',
        firstName: 'Fresh', lastName: 'Student',
        role: 'STUDENT',
      },
      select: { id: true },
    })
    const freshStudent = await prisma.student.create({
      data: { userId: freshUser.id, gradeLevel: 7 },
      select: { id: true },
    })

    const result = await getEffectiveReadingLevel(freshStudent.id, 2, false)
    expect(result.effectiveLevel).toBe(2)
    expect(result.accommodationApplied).toBe(false)

    // Cleanup
    await prisma.student.delete({ where: { id: freshStudent.id } })
    await prisma.user.delete({ where: { id: freshUser.id } })
  })

  it('returns level 1 when ACC-SIMPLE-LANG accommodation is active', async () => {
    const result = await getEffectiveReadingLevel(studentId, 2, false)
    expect(result.effectiveLevel).toBe(1)
    expect(result.accommodationApplied).toBe(true)
  })

  it('returns level 1 when ELL accommodation is active', async () => {
    // First deactivate ACC-SIMPLE-LANG, add ELL
    await setAccommodation(teacherUserId, studentId, 'ACC-SIMPLE-LANG', false)
    await setAccommodation(teacherUserId, studentId, 'ELL', true)

    const result = await getEffectiveReadingLevel(studentId, 2, false)
    expect(result.effectiveLevel).toBe(1)

    // Restore
    await setAccommodation(teacherUserId, studentId, 'ELL', false)
    await setAccommodation(teacherUserId, studentId, 'ACC-SIMPLE-LANG', true)
  })

  it('does NOT override for MASTERY_CHALLENGE (isMasteryChallenge=true)', async () => {
    // ACC-SIMPLE-LANG is active but mastery challenge level should not be downgraded
    const result = await getEffectiveReadingLevel(studentId, 2, true)
    expect(result.effectiveLevel).toBe(2)
    expect(result.accommodationApplied).toBe(false)
  })

  it('returns accommodationApplied: true when override occurred', async () => {
    const result = await getEffectiveReadingLevel(studentId, 2, false)
    expect(result.accommodationApplied).toBe(true)
  })

  it('includes active accommodation codes in result', async () => {
    const result = await getEffectiveReadingLevel(studentId, 2, false)
    expect(result.codes).toContain('ACC-SIMPLE-LANG')
  })
})

// ── fetchStimulusForQuestion ───────────────────────────────────────────────

describe('fetchStimulusForQuestion', () => {
  it('returns null for a question without stimulusId', async () => {
    const result = await fetchStimulusForQuestion(questionWithoutStimId, 2, [])
    expect(result).toBeNull()
  })

  it('returns level-2 content at effective level 2', async () => {
    const result = await fetchStimulusForQuestion(questionWithStimId, 2, [])
    expect(result).not.toBeNull()
    expect(result!.resolvedContent).toBe('Level 2: Chunked excerpt.')
    expect(result!.resolvedLevel).toBe(2)
    expect(result!.fromVariant).toBe(true)
  })

  it('returns level-1 content for ELL student (effective level 1)', async () => {
    // Student has ACC-SIMPLE-LANG active — effective level is 1
    const { effectiveLevel } = await getEffectiveReadingLevel(studentId, 2, false)
    const result = await fetchStimulusForQuestion(questionWithStimId, effectiveLevel, [])
    expect(result!.resolvedContent).toBe('Level 1: Simple paraphrase.')
    expect(result!.resolvedLevel).toBe(1)
  })

  it('returns base content when requested variant is absent (level 3 requested, no level-3 variant)', async () => {
    const result = await fetchStimulusForQuestion(questionWithStimId, 3, [])
    // Level 3 = base content (no level-3 variant created)
    expect(result!.resolvedContent).toBe('Raw passage about natural rights — level 3.')
    expect(result!.fromVariant).toBe(false)
  })

  it('returns stimulus title and id in attachment', async () => {
    const result = await fetchStimulusForQuestion(questionWithStimId, 2, [])
    expect(result!.stimulusId).toBe(stimulusId)
    expect(result!.stimulusTitle).toBe('[TEST-P7] Natural Rights Passage')
  })
})

// ── Mastery Challenge level-2 enforcement ─────────────────────────────────

describe('gradeAndSubmit — Mastery Challenge level-2 enforcement (Audit 7 item 2)', () => {
  it('throws INVALID_CONTENT when assessment contains level-1 questions', async () => {
    // Get the correct option for the level-1 question
    const options = await prisma.questionOption.findMany({
      where: { question: { prompt: { contains: '[TEST-P7] Level-1 question' } } },
      select: { id: true, questionId: true, isCorrect: true },
    })
    const correctOpt = options.find((o) => o.isCorrect)!

    let threw = false
    try {
      await gradeAndSubmit(
        {
          attemptId: masteryAttemptId,
          responses: [
            {
              questionId: correctOpt.questionId,
              selectedOptionId: correctOpt.id,
              confidence: 2,
            },
          ],
        },
        studentId
      )
    } catch (err: unknown) {
      threw = true
      const e = err as { code?: string; name?: string }
      expect(e.name).toBe('AssessmentError')
      expect(e.code).toBe('INVALID_CONTENT')
    }
    expect(threw).toBe(true)
  })
})
