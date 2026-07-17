/**
 * Integration — Strategy Track usage tracking, requirements, IDOR, analytics.
 *
 * Covers: server-side round grading (correct increments a "use", incorrect does
 * not), requirement resolution (class global / override / waive), the roster
 * IDOR guard on setStrategyOverride, roster completion analytics, and the badge
 * award hook.
 *
 * Prefix: test-strat- (isolated from other suites + auth cleanup).
 */

import { PrismaClient } from '@prisma/client'
import {
  getStrategyMission,
  getStrategyMissionForStudent,
  submitStrategyRound,
  resolveStrategyRequirements,
  setStrategyOverride,
  getStrategyProgress,
  StrategyTrackError,
} from '@/lib/strategy-track'
import { getStrategyCompletionStatus } from '@/lib/class-analytics'
import { evaluateAndAwardBadges } from '@/lib/badges/award'
import { enrollStudentWithTeacher, cleanupTestRoster } from '../helpers/roster'

const prisma = new PrismaClient()
const PREFIX = 'test-strat-'

let teacherUserId: string
let studentId: string
let outsiderStudentId: string
let classId: string

/** Build the all-correct answer set for a mission from its authored key. */
function correctAnswers(missionCode: string) {
  const m = getStrategyMission(missionCode)!
  return m.checks.map((c, i) => ({ checkIndex: i, optionId: c.correctOptionId }))
}

beforeAll(async () => {
  const teacherUser = await prisma.user.upsert({
    where: { cleverId: `${PREFIX}teacher` },
    update: {},
    create: {
      cleverId: `${PREFIX}teacher`,
      firstName: 'Strat',
      lastName: 'Teacher',
      role: 'TEACHER',
      status: 'ACTIVE',
    },
  })
  teacherUserId = teacherUser.id
  await prisma.teacher.upsert({
    where: { userId: teacherUserId },
    update: {},
    create: { userId: teacherUserId },
  })

  const mk = async (suffix: string) => {
    const u = await prisma.user.upsert({
      where: { cleverId: `${PREFIX}${suffix}` },
      update: {},
      create: {
        cleverId: `${PREFIX}${suffix}`,
        firstName: 'Strat',
        lastName: suffix,
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    })
    const s = await prisma.student.upsert({
      where: { userId: u.id },
      update: {},
      create: { userId: u.id, gradeLevel: 7 },
      select: { id: true },
    })
    return s.id
  }
  studentId = await mk('student')
  outsiderStudentId = await mk('outsider')

  const enrolled = await enrollStudentWithTeacher(prisma, teacherUserId, studentId)
  classId = enrolled.classId
  // Class-wide requirement: use each strategy 3 times.
  await prisma.class.update({
    where: { id: classId },
    data: { strategyUsesRequired: 3 },
  })
})

afterAll(async () => {
  const sids = [studentId, outsiderStudentId].filter(Boolean)
  await prisma.auditLog.deleteMany({ where: { actorUserId: teacherUserId } })
  await prisma.studentStrategyOverride.deleteMany({ where: { studentId: { in: sids } } })
  await prisma.strategyTrackProgress.deleteMany({ where: { studentId: { in: sids } } })
  await prisma.studentBadge.deleteMany({ where: { studentId: { in: sids } } })
  await cleanupTestRoster(prisma, teacherUserId)
  await prisma.student.deleteMany({ where: { user: { cleverId: { startsWith: PREFIX } } } })
  await prisma.teacher.deleteMany({ where: { user: { cleverId: { startsWith: PREFIX } } } })
  await prisma.user.deleteMany({ where: { cleverId: { startsWith: PREFIX } } })
  await prisma.$disconnect()
})

describe('submitStrategyRound grading', () => {
  it('a correct round increments useCount and sets completedAt', async () => {
    const r1 = await submitStrategyRound(
      studentId,
      'eliminate-distractor',
      correctAnswers('eliminate-distractor')
    )
    expect(r1.correct).toBe(true)
    expect(r1.useCount).toBe(1)

    const r2 = await submitStrategyRound(
      studentId,
      'eliminate-distractor',
      correctAnswers('eliminate-distractor')
    )
    expect(r2.correct).toBe(true)
    expect(r2.useCount).toBe(2)

    const row = await prisma.strategyTrackProgress.findUnique({
      where: { studentId_missionCode: { studentId, missionCode: 'eliminate-distractor' } },
      select: { useCount: true, completedAt: true },
    })
    expect(row?.useCount).toBe(2)
    expect(row?.completedAt).not.toBeNull()
  })

  it('an incorrect round does NOT increment useCount', async () => {
    const m = getStrategyMission('watch-the-words')!
    const wrongOption = m.checks[0].options.find(
      (o) => o.id !== m.checks[0].correctOptionId
    )!
    const answers = m.checks.map((c, i) => ({
      checkIndex: i,
      optionId: i === 0 ? wrongOption.id : c.correctOptionId,
    }))
    const res = await submitStrategyRound(studentId, 'watch-the-words', answers)
    expect(res.correct).toBe(false)
    expect(res.useCount).toBe(0)
  })

  it('grading is by option id, so the served shuffle is safe', async () => {
    const served = getStrategyMissionForStudent(studentId, 'evidence-based')!
    const authored = getStrategyMission('evidence-based')!
    const answers = served.checks.map((_, i) => ({
      checkIndex: i,
      optionId: authored.checks[i].correctOptionId,
    }))
    const res = await submitStrategyRound(studentId, 'evidence-based', answers)
    expect(res.correct).toBe(true)
  })

  it('rejects an unknown mission', async () => {
    await expect(
      submitStrategyRound(studentId, 'nope', [{ checkIndex: 0, optionId: 'a' }])
    ).rejects.toBeInstanceOf(StrategyTrackError)
  })
})

describe('resolveStrategyRequirements', () => {
  it('falls back to the class global, honors overrides and waivers', async () => {
    await setStrategyOverride(teacherUserId, studentId, 'two-pass', {
      requiredUses: 5,
      waived: false,
    })
    await setStrategyOverride(teacherUserId, studentId, 'time-management', {
      requiredUses: null,
      waived: true,
    })

    const { classGlobal, byCode } = await resolveStrategyRequirements(studentId)
    expect(classGlobal).toBe(3)
    expect(byCode.get('flag-and-return')?.required).toBe(3) // class default
    expect(byCode.get('two-pass')?.required).toBe(5) // override
    expect(byCode.get('time-management')).toEqual({ required: 0, waived: true }) // waived
  })
})

describe('setStrategyOverride roster scope (IDOR)', () => {
  it('throws FORBIDDEN for a student not in the teacher class and writes nothing', async () => {
    await expect(
      setStrategyOverride(teacherUserId, outsiderStudentId, 'two-pass', {
        requiredUses: 9,
        waived: false,
      })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })

    const count = await prisma.studentStrategyOverride.count({
      where: { studentId: outsiderStudentId },
    })
    expect(count).toBe(0)
  })
})

describe('getStrategyCompletionStatus', () => {
  it('reports uses + owed for roster students and excludes outsiders', async () => {
    const rows = await getStrategyCompletionStatus(teacherUserId)
    const mine = rows.find((r) => r.studentId === studentId)
    expect(mine).toBeDefined()
    expect(mine!.totalUses).toBeGreaterThanOrEqual(2)
    expect(mine!.owed).toBeGreaterThan(0)
    expect(rows.some((r) => r.studentId === outsiderStudentId)).toBe(false)
  })
})

describe('getStrategyProgress', () => {
  it('marks a mission met once useCount reaches the required count', async () => {
    // eliminate-distractor already at 2; one more correct round reaches 3.
    await submitStrategyRound(
      studentId,
      'eliminate-distractor',
      correctAnswers('eliminate-distractor')
    )
    const { progress } = await getStrategyProgress(studentId)
    const row = progress.find((p) => p.code === 'eliminate-distractor')!
    expect(row.useCount).toBeGreaterThanOrEqual(3)
    expect(row.met).toBe(true)
  })
})

describe('badge award hook', () => {
  it('awards the strategy-track badge once all 7 missions have a use', async () => {
    for (const m of [
      'watch-the-words',
      'flag-and-return',
      'time-management',
      'two-pass',
      'misconception-spotter',
    ]) {
      await submitStrategyRound(studentId, m, correctAnswers(m))
    }

    const trackBadge = await prisma.badge.findFirst({
      where: { name: 'Master Strategist' },
      select: { id: true },
    })
    if (!trackBadge) return // badges not seeded in this DB — nothing to assert

    await evaluateAndAwardBadges(studentId)
    const has = await prisma.studentBadge.findUnique({
      where: { studentId_badgeId: { studentId, badgeId: trackBadge.id } },
      select: { id: true },
    })
    expect(has).not.toBeNull()
  })
})
