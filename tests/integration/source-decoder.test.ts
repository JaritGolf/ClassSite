/**
 * Integration Tests — Source Decoder Track (Phase 7)
 *
 * Tests progress tracking, prerequisite enforcement, and mission definitions.
 * Uses real DB (requires DATABASE_URL in env).
 * Prefix: test-phase7-sd- (avoids collision with reading-load tests)
 */

import { prisma } from '@/lib/db'
import {
  getSourceDecoderProgress,
  completeSourceDecoderLevel,
  getSourceDecoderMissions,
  getSourceDecoderMission,
  SourceDecoderError,
} from '@/lib/reading-load'

const STUDENT_CLEVERID = 'test-phase7-sd-student-001'
let studentId: string

// ── Setup ──────────────────────────────────────────────────────────────────

beforeAll(async () => {
  const studentUser = await prisma.user.upsert({
    where: { cleverId: STUDENT_CLEVERID },
    create: {
      cleverId: STUDENT_CLEVERID,
      email: `${STUDENT_CLEVERID}@test.invalid`,
      firstName: 'Phase7SD', lastName: 'Student',
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
})

afterAll(async () => {
  await prisma.sourceDecoderProgress.deleteMany({ where: { studentId } })
  await prisma.student.deleteMany({ where: { id: studentId } })
  await prisma.user.deleteMany({ where: { cleverId: STUDENT_CLEVERID } })
  await prisma.$disconnect()
})

// ── Pure mission functions (no DB) ─────────────────────────────────────────

describe('getSourceDecoderMissions', () => {
  it('returns 4 missions', () => {
    const missions = getSourceDecoderMissions()
    expect(missions).toHaveLength(4)
  })

  it('missions are ordered levels 1–4', () => {
    const missions = getSourceDecoderMissions()
    expect(missions.map((m) => m.level)).toEqual([1, 2, 3, 4])
  })
})

describe('getSourceDecoderMission', () => {
  it('returns level-1 mission with activityType HIGHLIGHT_ANSWER', () => {
    const m = getSourceDecoderMission(1)
    expect(m).not.toBeNull()
    expect(m!.activityType).toBe('HIGHLIGHT_ANSWER')
    expect(m!.level).toBe(1)
  })

  it('returns level-4 mission with activityType COMPARE_SOURCES', () => {
    const m = getSourceDecoderMission(4)
    expect(m!.activityType).toBe('COMPARE_SOURCES')
  })

  it('returns null for level 5 (out of range)', () => {
    expect(getSourceDecoderMission(5)).toBeNull()
  })

  it('returns null for level 0 (out of range)', () => {
    expect(getSourceDecoderMission(0)).toBeNull()
  })

  it('level-2 mission has activityType PARAPHRASE_CLAIM', () => {
    expect(getSourceDecoderMission(2)!.activityType).toBe('PARAPHRASE_CLAIM')
  })

  it('level-3 mission has activityType AUTHOR_PURPOSE', () => {
    expect(getSourceDecoderMission(3)!.activityType).toBe('AUTHOR_PURPOSE')
  })
})

// ── getSourceDecoderProgress (empty state) ─────────────────────────────────

describe('getSourceDecoderProgress — fresh student', () => {
  it('returns all 4 levels with completedAt: null', async () => {
    const { progress } = await getSourceDecoderProgress(studentId)
    expect(progress).toHaveLength(4)
    expect(progress.every((p) => p.completedAt === null)).toBe(true)
    expect(progress.every((p) => p.isCompleted === false)).toBe(true)
  })

  it('returns highestCompletedLevel: 0 for new student', async () => {
    const { highestCompletedLevel } = await getSourceDecoderProgress(studentId)
    expect(highestCompletedLevel).toBe(0)
  })
})

// ── completeSourceDecoderLevel ─────────────────────────────────────────────

describe('completeSourceDecoderLevel', () => {
  it('completes level 1 and returns the record', async () => {
    const result = await completeSourceDecoderLevel(studentId, 1)
    expect(result.level).toBe(1)
    expect(result.completedAt).toBeInstanceOf(Date)
    expect(result.alreadyCompleted).toBe(false)
  })

  it('getSourceDecoderProgress after level 1 shows highestCompletedLevel: 1', async () => {
    const { highestCompletedLevel, progress } = await getSourceDecoderProgress(studentId)
    expect(highestCompletedLevel).toBe(1)
    expect(progress.find((p) => p.level === 1)?.isCompleted).toBe(true)
    expect(progress.find((p) => p.level === 2)?.isCompleted).toBe(false)
  })

  it('is idempotent — second call returns same completedAt', async () => {
    const first = await completeSourceDecoderLevel(studentId, 1)
    const second = await completeSourceDecoderLevel(studentId, 1)
    expect(second.alreadyCompleted).toBe(true)
    expect(second.completedAt.getTime()).toBe(first.completedAt.getTime())
  })

  it('completes level 2 after level 1 is done', async () => {
    const result = await completeSourceDecoderLevel(studentId, 2)
    expect(result.level).toBe(2)
    expect(result.alreadyCompleted).toBe(false)
  })

  it('throws PREREQUISITE_NOT_MET if level 2 not done (test level 4 skipping level 3)', async () => {
    // Level 2 is done, level 3 is NOT done — trying to complete level 4 should fail
    let threw = false
    try {
      await completeSourceDecoderLevel(studentId, 4)
    } catch (err) {
      threw = true
      expect(err instanceof SourceDecoderError && err.code).toBe('PREREQUISITE_NOT_MET')
    }
    expect(threw).toBe(true)
  })

  it('throws LEVEL_OUT_OF_RANGE for level 5', async () => {
    let threw = false
    try {
      await completeSourceDecoderLevel(studentId, 5)
    } catch (err) {
      threw = true
      expect(err instanceof SourceDecoderError && err.code).toBe('LEVEL_OUT_OF_RANGE')
    }
    expect(threw).toBe(true)
  })

  it('throws LEVEL_OUT_OF_RANGE for level 0', async () => {
    let threw = false
    try {
      await completeSourceDecoderLevel(studentId, 0)
    } catch (err) {
      threw = true
      expect(err instanceof SourceDecoderError && err.code).toBe('LEVEL_OUT_OF_RANGE')
    }
    expect(threw).toBe(true)
  })
})
