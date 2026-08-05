/**
 * Mission progression — unlocking crosses unit boundaries and skips dead ends.
 *
 * Regression cover for three defects that together walled students in place:
 *
 *   1. `unlockNextBenchmark` was scoped to `unitId`, so mastering the last
 *      benchmark of a unit (SS.7.CG.1.6) unlocked nothing at all.
 *   2. Some benchmarks have no authored assessments (SS.7.CG.1.8/1.9/1.11), which
 *      makes them impossible to master AND impossible to off-ramp. Unlocking into
 *      one parks the student on a permanently stuck row.
 *   3. Units 3-7 are seeded inactive (no content), so the chain must simply end
 *      rather than advance into them.
 *
 * These assert against SEEDED content, so they double as a canary: if a future
 * content wave authors assessments for 1.8/1.9/1.11 or activates Unit 3, the
 * "skips"/"ends" expectations here are supposed to fail and be updated.
 *
 * Prefix: test-xunit- (isolated from other suites + auth cleanup).
 */

import { PrismaClient } from '@prisma/client'
import { unlockNextBenchmark, findNextReachableBenchmark } from '@/lib/mastery'

const prisma = new PrismaClient()
const PREFIX = 'test-xunit-'
const STUDENT_CLEVER_ID = `${PREFIX}student-001`

let studentId: string
const benchmarkIdByCode = new Map<string, string>()

/** Resolve a seeded benchmark id by code, failing loudly if the seed is missing. */
function bm(code: string): string {
  const id = benchmarkIdByCode.get(code)
  if (!id) throw new Error(`Seeded benchmark ${code} not found — run npm run db:seed`)
  return id
}

beforeAll(async () => {
  const user = await prisma.user.upsert({
    where: { cleverId: STUDENT_CLEVER_ID },
    update: {},
    create: {
      cleverId: STUDENT_CLEVER_ID,
      email: `${STUDENT_CLEVER_ID}@test.invalid`,
      firstName: 'Cross',
      lastName: 'Unit',
      role: 'STUDENT',
      status: 'ACTIVE',
    },
  })
  const student = await prisma.student.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, gradeLevel: 7 },
  })
  studentId = student.id

  const benchmarks = await prisma.benchmark.findMany({
    where: { code: { startsWith: 'SS.7.CG.' } },
    select: { id: true, code: true },
  })
  for (const b of benchmarks) benchmarkIdByCode.set(b.code, b.id)
})

afterAll(async () => {
  await prisma.studentProgress.deleteMany({ where: { studentId } })
  await prisma.student.deleteMany({ where: { user: { cleverId: { startsWith: PREFIX } } } })
  await prisma.user.deleteMany({ where: { cleverId: { startsWith: PREFIX } } })
  await prisma.$disconnect()
})

/** Each test starts from a clean progress slate for this student. */
beforeEach(async () => {
  await prisma.studentProgress.deleteMany({ where: { studentId } })
})

// ── The entry point ───────────────────────────────────────────────────────────

describe('findNextReachableBenchmark', () => {
  it('the first reachable mission is SS.7.CG.1.1', async () => {
    const first = await findNextReachableBenchmark(0)
    expect(first).not.toBeNull()
    expect(first!.code).toBe('SS.7.CG.1.1')
    expect(first!.sequenceOrder).toBe(1)
  })

  it('never returns a benchmark without an approved Mastery Challenge', async () => {
    // Walk the whole reachable chain and verify every hop is masterable.
    let cursor = 0
    const visited: string[] = []
    for (;;) {
      const next = await findNextReachableBenchmark(cursor)
      if (!next) break
      visited.push(next.code)
      const masterable = await prisma.assessment.count({
        where: {
          benchmarkId: next.id,
          assessmentType: 'MASTERY_CHALLENGE',
          approvalStatus: 'APPROVED',
        },
      })
      expect(masterable).toBeGreaterThan(0)
      cursor = next.sequenceOrder
    }
    // Sanity: the chain is non-trivial and excludes the known content gaps.
    expect(visited.length).toBeGreaterThanOrEqual(2)
    expect(visited).not.toContain('SS.7.CG.1.9')
    expect(visited).not.toContain('SS.7.CG.1.11')
  })
})

// ── Defect 1: the unit wall ───────────────────────────────────────────────────

describe('unlocking crosses the unit boundary', () => {
  it('mastering SS.7.CG.1.6 (last of Unit 1) unlocks SS.7.CG.1.7 (first of Unit 2)', async () => {
    const created = await unlockNextBenchmark(studentId, bm('SS.7.CG.1.6'))
    expect(created).toBe(true)

    const row = await prisma.studentProgress.findUnique({
      where: { studentId_benchmarkId: { studentId, benchmarkId: bm('SS.7.CG.1.7') } },
    })
    expect(row).not.toBeNull()
    expect(row!.status).toBe('NOT_STARTED')
  })

  it('the two benchmarks really are in different units (guards the premise)', async () => {
    const [a, b] = await Promise.all([
      prisma.benchmark.findUnique({ where: { id: bm('SS.7.CG.1.6') }, select: { unitId: true } }),
      prisma.benchmark.findUnique({ where: { id: bm('SS.7.CG.1.7') }, select: { unitId: true } }),
    ])
    expect(a!.unitId).not.toBe(b!.unitId)
  })
})

// ── Defect 2: content dead ends ───────────────────────────────────────────────

describe('unlocking skips benchmarks with no authored Mastery Challenge', () => {
  it('mastering SS.7.CG.1.7 unlocks SS.7.CG.1.10, skipping 1.8 and 1.9', async () => {
    const created = await unlockNextBenchmark(studentId, bm('SS.7.CG.1.7'))
    expect(created).toBe(true)

    const [skipped8, skipped9, landed] = await Promise.all([
      prisma.studentProgress.findUnique({
        where: { studentId_benchmarkId: { studentId, benchmarkId: bm('SS.7.CG.1.8') } },
      }),
      prisma.studentProgress.findUnique({
        where: { studentId_benchmarkId: { studentId, benchmarkId: bm('SS.7.CG.1.9') } },
      }),
      prisma.studentProgress.findUnique({
        where: { studentId_benchmarkId: { studentId, benchmarkId: bm('SS.7.CG.1.10') } },
      }),
    ])
    expect(skipped8).toBeNull()
    expect(skipped9).toBeNull()
    expect(landed).not.toBeNull()
  })
})

// ── Defect 3: end of authored course ──────────────────────────────────────────

describe('the chain ends rather than advancing into inactive units', () => {
  it('mastering the last reachable mission unlocks nothing', async () => {
    // Find the true tail of the chain instead of hardcoding it.
    let cursor = 0
    let last: { id: string; sequenceOrder: number } | null = null
    for (;;) {
      const next = await findNextReachableBenchmark(cursor)
      if (!next) break
      last = next
      cursor = next.sequenceOrder
    }
    expect(last).not.toBeNull()

    const created = await unlockNextBenchmark(studentId, last!.id)
    expect(created).toBe(false)
  })

  it('inactive units contribute no reachable benchmarks', async () => {
    const inactiveReachable = await prisma.benchmark.count({
      where: {
        unit: { active: false },
        assessments: {
          some: { assessmentType: 'MASTERY_CHALLENGE', approvalStatus: 'APPROVED' },
        },
      },
    })
    expect(inactiveReachable).toBe(0)
  })
})

// ── Idempotency (unchanged behavior, kept covered) ────────────────────────────

describe('unlock is idempotent', () => {
  it('a second unlock of the same next benchmark returns false', async () => {
    expect(await unlockNextBenchmark(studentId, bm('SS.7.CG.1.6'))).toBe(true)
    expect(await unlockNextBenchmark(studentId, bm('SS.7.CG.1.6'))).toBe(false)
  })

  it('an unknown benchmark id returns false rather than throwing', async () => {
    expect(await unlockNextBenchmark(studentId, 'does-not-exist')).toBe(false)
  })
})
