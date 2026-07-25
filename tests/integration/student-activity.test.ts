/**
 * StudentLastActivity integration — dashboard "pick up where you left off".
 *
 * recordLastActivity() upserts a single row per student; getLastActivityForStudent()
 * resolves it into display data for every activity surface the app can record.
 */

import { PrismaClient } from '@prisma/client'
import { recordLastActivity, getLastActivityForStudent } from '@/lib/student-activity'
import { getStrategyMissions } from '@/lib/strategy-track'

const prisma = new PrismaClient()

const CLEVER_ID = 'test-student-activity-001'
let studentId: string
let benchmarkId: string
let benchmarkCode: string
let benchmarkTitle: string

beforeAll(async () => {
  const benchmark = await prisma.benchmark.findUnique({ where: { code: 'SS.7.CG.1.1' } })
  expect(benchmark).not.toBeNull()
  benchmarkId = benchmark!.id
  benchmarkCode = benchmark!.code
  benchmarkTitle = benchmark!.title

  const user = await prisma.user.upsert({
    where: { cleverId: CLEVER_ID },
    update: {},
    create: {
      cleverId: CLEVER_ID,
      firstName: 'Activity',
      lastName: 'TestStudent',
      role: 'STUDENT',
      status: 'ACTIVE',
    },
  })
  const student = await prisma.student.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  })
  studentId = student.id
})

afterAll(async () => {
  await prisma.studentLastActivity.deleteMany({ where: { studentId } })
  await prisma.student.deleteMany({ where: { user: { cleverId: CLEVER_ID } } })
  await prisma.user.deleteMany({ where: { cleverId: CLEVER_ID } })
  await prisma.$disconnect()
})

describe('getLastActivityForStudent', () => {
  it('returns null for a student with no recorded activity', async () => {
    const result = await getLastActivityForStudent(studentId)
    expect(result).toBeNull()
  })

  it('resolves MISSION_TRAINING to the mission page with the benchmark title', async () => {
    await recordLastActivity(studentId, 'MISSION_TRAINING', benchmarkId)
    const result = await getLastActivityForStudent(studentId)
    expect(result).toMatchObject({
      label: 'Training',
      subLabel: benchmarkTitle,
      href: `/student/mission/${benchmarkCode}`,
      icon: 'sparkle',
    })
  })

  it('resolves ASSESSMENT to the correct mission-phase label via the assessment record', async () => {
    const assessment = await prisma.assessment.findFirst({
      where: { benchmarkId, assessmentType: 'MASTERY_CHALLENGE' },
      select: { id: true },
    })
    expect(assessment).not.toBeNull()

    await recordLastActivity(studentId, 'ASSESSMENT', assessment!.id)
    const result = await getLastActivityForStudent(studentId)
    expect(result).toMatchObject({
      label: 'Mastery Challenge',
      subLabel: benchmarkTitle,
      href: `/student/mission/${benchmarkCode}`,
      icon: 'shield',
    })
  })

  it('resolves DAILY_DRILL to the drill page with the benchmark as context', async () => {
    await recordLastActivity(studentId, 'DAILY_DRILL', benchmarkId)
    const result = await getLastActivityForStudent(studentId)
    expect(result).toMatchObject({
      label: 'Daily Republic Drill',
      subLabel: benchmarkTitle,
      href: '/student/daily-drill',
      icon: 'bolt',
    })
  })

  it('resolves STRATEGY_TRACK to the strategy page with the mission title', async () => {
    const mission = getStrategyMissions()[0]
    await recordLastActivity(studentId, 'STRATEGY_TRACK', mission.code)
    const result = await getLastActivityForStudent(studentId)
    expect(result).toMatchObject({
      label: 'Strategist Track',
      subLabel: mission.title,
      href: '/student/strategy',
      icon: 'medal',
    })
  })

  it('resolves SOURCE_DECODER to the source decoder page with the level', async () => {
    await recordLastActivity(studentId, 'SOURCE_DECODER', '2')
    const result = await getLastActivityForStudent(studentId)
    expect(result).toMatchObject({
      label: 'Source Decoder',
      subLabel: 'Level 2',
      href: '/student/source-decoder',
      icon: 'search',
    })
  })

  it('resolves REMEDIATION to the remediation page with the item title', async () => {
    const remediationItem = await prisma.remediationItem.findFirst({
      where: { benchmarkId },
      select: { id: true, title: true },
    })
    expect(remediationItem).not.toBeNull()

    const studentRemediation = await prisma.studentRemediation.create({
      data: {
        studentId,
        benchmarkId,
        remediationItemId: remediationItem!.id,
        status: 'ASSIGNED',
      },
    })

    await recordLastActivity(studentId, 'REMEDIATION', studentRemediation.id)
    const result = await getLastActivityForStudent(studentId)
    expect(result).toMatchObject({
      label: 'Training Mission',
      subLabel: remediationItem!.title,
      href: `/student/remediation/${studentRemediation.id}`,
      icon: 'target',
    })

    await prisma.studentRemediation.delete({ where: { id: studentRemediation.id } })
  })

  it('overwrites the single row across activity types (last write wins)', async () => {
    await recordLastActivity(studentId, 'MISSION_TRAINING', benchmarkId)
    await recordLastActivity(studentId, 'SOURCE_DECODER', '1')

    const result = await getLastActivityForStudent(studentId)
    expect(result?.label).toBe('Source Decoder')

    const rows = await prisma.studentLastActivity.count({ where: { studentId } })
    expect(rows).toBe(1)
  })

  it('returns null gracefully (not a throw) when the referenced row no longer exists', async () => {
    await recordLastActivity(studentId, 'MISSION_TRAINING', 'nonexistent-benchmark-id')
    const result = await getLastActivityForStudent(studentId)
    expect(result).toBeNull()
  })

  it('returns null gracefully when a REMEDIATION reference belongs to a different student', async () => {
    const otherUser = await prisma.user.upsert({
      where: { cleverId: 'test-student-activity-other' },
      update: {},
      create: {
        cleverId: 'test-student-activity-other',
        firstName: 'Other',
        lastName: 'TestStudent',
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    })
    const otherStudent = await prisma.student.upsert({
      where: { userId: otherUser.id },
      update: {},
      create: { userId: otherUser.id },
    })
    const remediationItem = await prisma.remediationItem.findFirst({
      where: { benchmarkId },
      select: { id: true },
    })
    const otherRemediation = await prisma.studentRemediation.create({
      data: {
        studentId: otherStudent.id,
        benchmarkId,
        remediationItemId: remediationItem!.id,
        status: 'ASSIGNED',
      },
    })

    await recordLastActivity(studentId, 'REMEDIATION', otherRemediation.id)
    const result = await getLastActivityForStudent(studentId)
    expect(result).toBeNull()

    await prisma.studentRemediation.delete({ where: { id: otherRemediation.id } })
    await prisma.student.delete({ where: { id: otherStudent.id } })
    await prisma.user.delete({ where: { id: otherUser.id } })
  })
})
