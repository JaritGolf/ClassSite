/**
 * Integration Tests: Test-Taking Strategy Track (spec §19.2).
 */

import { PrismaClient } from '@prisma/client'
import {
  getStrategyMissions,
  getStrategyProgress,
  completeStrategyMission,
  StrategyTrackError,
} from '@/lib/strategy-track'

const prisma = new PrismaClient()
const CLEVER_ID = 'test-strategy-student-001'
let studentId: string

beforeAll(async () => {
  const user = await prisma.user.upsert({
    where: { cleverId: CLEVER_ID },
    update: {},
    create: { cleverId: CLEVER_ID, firstName: 'Strat', lastName: 'Test', role: 'STUDENT', status: 'ACTIVE' },
  })
  const student = await prisma.student.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  })
  studentId = student.id
})

afterAll(async () => {
  await prisma.strategyTrackProgress.deleteMany({ where: { studentId } })
  await prisma.student.deleteMany({ where: { user: { cleverId: CLEVER_ID } } })
  await prisma.user.deleteMany({ where: { cleverId: CLEVER_ID } })
  await prisma.$disconnect()
})

describe('strategy track', () => {
  it('defines all 7 strategy missions (§19.2)', () => {
    expect(getStrategyMissions()).toHaveLength(7)
  })

  it('records completion and is idempotent', async () => {
    const first = await completeStrategyMission(studentId, 'eliminate-distractor')
    expect(first.alreadyCompleted).toBe(false)

    const second = await completeStrategyMission(studentId, 'eliminate-distractor')
    expect(second.alreadyCompleted).toBe(true)
    expect(second.completedAt.getTime()).toBe(first.completedAt.getTime())

    const { completedCount, progress } = await getStrategyProgress(studentId)
    expect(completedCount).toBe(1)
    expect(progress.find((p) => p.code === 'eliminate-distractor')?.isCompleted).toBe(true)
  })

  it('rejects an unknown mission code', async () => {
    await expect(completeStrategyMission(studentId, 'not-a-mission')).rejects.toBeInstanceOf(
      StrategyTrackError
    )
  })
})
