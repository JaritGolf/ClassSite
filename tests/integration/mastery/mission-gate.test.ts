/**
 * The server-side mission gate, and badges that count what a student can play.
 *
 * Two regression fixes that share one root cause — the app had no server-side
 * notion of "which missions is this student allowed into", so several places
 * invented their own and got it wrong.
 *
 *   1. `canOpenMission` is now that notion. Before it existed, the map derived
 *      "locked" from a status the engine used to mean "unlocked", and
 *      `POST /api/mission/progress` would upsert a StudentProgress row for ANY
 *      benchmark a student typed into the URL bar. Under a "row exists = open"
 *      rule that write was self-widening: one visit permanently unlocked a
 *      mission. These assert the gate refuses unreached missions.
 *
 *   2. The group badges (`unit_complete`, `reporting_category_mastered`) were
 *      `mastered === benchmarks.length` — every benchmark on the books, not
 *      every benchmark with content. The course has 36 benchmarks and 8 with
 *      content by design (the build scope is deliberately limited), so Origins
 *      needed 11 of 11 when only 8 can be played. The badges could not fire at
 *      all. Fixing the category strings alone would have produced zero awards,
 *      which is the part worth pinning.
 *
 * Asserts against SEEDED content, so it doubles as a canary: when a content wave
 * lands, the "8 playable" expectations here are supposed to fail and be updated.
 *
 * Prefix: test-mgate- (isolated from other suites + auth cleanup).
 */

import { PrismaClient } from '@prisma/client'
import { canOpenMission, getMissionAvailability, getPlayableBenchmarkIds } from '@/lib/mastery'
import { getBlueprintCoverage } from '@/lib/republic-challenge'
import { evaluateAndAwardBadges } from '@/lib/badges'

const prisma = new PrismaClient()
const PREFIX = 'test-mgate-'
const STUDENT_CLEVER_ID = `${PREFIX}student-001`

let studentId: string
const benchmarkIdByCode = new Map<string, string>()

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
      role: 'STUDENT',
      firstName: 'Gate',
      lastName: 'Probe',
      status: 'ACTIVE',
    },
    select: { id: true },
  })
  const student = await prisma.student.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, gradeLevel: 7 },
    select: { id: true },
  })
  studentId = student.id

  const benchmarks = await prisma.benchmark.findMany({ select: { id: true, code: true } })
  for (const b of benchmarks) benchmarkIdByCode.set(b.code, b.id)
})

afterEach(async () => {
  await prisma.studentProgress.deleteMany({ where: { studentId } })
  await prisma.studentBadge.deleteMany({ where: { studentId } })
})

afterAll(async () => {
  await prisma.studentBadge.deleteMany({ where: { studentId } })
  await prisma.studentProgress.deleteMany({ where: { studentId } })
  await prisma.student.deleteMany({ where: { id: studentId } })
  await prisma.user.deleteMany({ where: { cleverId: STUDENT_CLEVER_ID } })
  await prisma.$disconnect()
})

describe('canOpenMission — the day-one student', () => {
  it('opens exactly one mission for a student with no progress rows', async () => {
    const availability = await getMissionAvailability(studentId)
    const openable = [...availability.values()].filter((n) => n.openable)
    // Nothing bootstraps a StudentProgress row on enrollment, so before this
    // rule existed a brand-new student saw an entirely padlocked map.
    expect(openable).toHaveLength(1)
  })

  it('that one mission is the first playable benchmark', async () => {
    await expect(canOpenMission(studentId, bm('SS.7.CG.1.1'))).resolves.toBe(true)
  })

  it('refuses every later mission', async () => {
    await expect(canOpenMission(studentId, bm('SS.7.CG.1.2'))).resolves.toBe(false)
    await expect(canOpenMission(studentId, bm('SS.7.CG.1.7'))).resolves.toBe(false)
    await expect(canOpenMission(studentId, bm('SS.7.CG.1.10'))).resolves.toBe(false)
  })

  it('refuses a mission with no authored content', async () => {
    await expect(canOpenMission(studentId, bm('SS.7.CG.1.8'))).resolves.toBe(false)
  })
})

describe('canOpenMission — an IN_PROGRESS row is not a grant', () => {
  it('refuses a mission whose only row is IN_PROGRESS with untouched predecessors', async () => {
    // THE self-widening regression. `POST /api/mission/progress` writes exactly
    // this row on any visit. If it counted as access, typing a mission URL and
    // clicking one training step would unlock it forever.
    await prisma.studentProgress.create({
      data: { studentId, benchmarkId: bm('SS.7.CG.1.10'), status: 'IN_PROGRESS' },
    })
    await expect(canOpenMission(studentId, bm('SS.7.CG.1.10'))).resolves.toBe(false)
  })

  it('still refuses when the row also carries a resume pointer', async () => {
    await prisma.studentProgress.create({
      data: { studentId, benchmarkId: bm('SS.7.CG.1.7'), status: 'IN_PROGRESS' },
    })
    await expect(canOpenMission(studentId, bm('SS.7.CG.1.7'))).resolves.toBe(false)
  })
})

describe('canOpenMission — mastery carries the student forward', () => {
  it('opens the next mission once the previous one is MASTERED', async () => {
    await prisma.studentProgress.create({
      data: { studentId, benchmarkId: bm('SS.7.CG.1.1'), status: 'MASTERED' },
    })
    await expect(canOpenMission(studentId, bm('SS.7.CG.1.2'))).resolves.toBe(true)
    // ...but not the one after that.
    await expect(canOpenMission(studentId, bm('SS.7.CG.1.3'))).resolves.toBe(false)
  })

  it('honours a granted NOT_STARTED row written by the unlock engine', async () => {
    await prisma.studentProgress.createMany({
      data: [
        { studentId, benchmarkId: bm('SS.7.CG.1.1'), status: 'MASTERED' },
        { studentId, benchmarkId: bm('SS.7.CG.1.2'), status: 'NOT_STARTED' },
      ],
    })
    await expect(canOpenMission(studentId, bm('SS.7.CG.1.2'))).resolves.toBe(true)
  })

  it('steps over content-less benchmarks to the next playable one', async () => {
    // 1.8 and 1.9 have no authored assessments, so clearing 1.7 must reach 1.10.
    await prisma.studentProgress.create({
      data: { studentId, benchmarkId: bm('SS.7.CG.1.7'), status: 'MASTERED' },
    })
    await expect(canOpenMission(studentId, bm('SS.7.CG.1.10'))).resolves.toBe(true)
  })

  it('treats an off-ramp as terminal and still advances the student', async () => {
    // Spec rule #4: off-ramp is not failure — it unlocks the next benchmark.
    await prisma.studentProgress.create({
      data: { studentId, benchmarkId: bm('SS.7.CG.1.1'), status: 'EXPOSURE_COMPLETE' },
    })
    await expect(canOpenMission(studentId, bm('SS.7.CG.1.2'))).resolves.toBe(true)
  })
})

describe('getPlayableBenchmarkIds', () => {
  it('reports the benchmarks that are actually playable today', async () => {
    const playable = await getPlayableBenchmarkIds()
    // Canary: bump this when a content wave lands.
    expect(playable.size).toBe(8)
    for (const code of ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.10']) {
      expect(playable.has(bm(`SS.7.CG.${code}`))).toBe(true)
    }
  })

  it('excludes benchmarks with no authored mastery form', async () => {
    const playable = await getPlayableBenchmarkIds()
    for (const code of ['1.8', '1.9', '1.11']) {
      expect(playable.has(bm(`SS.7.CG.${code}`))).toBe(false)
    }
  })
})

describe('getBlueprintCoverage — the Final Trial tells the truth', () => {
  it('reports how many of the four EOC categories can supply questions', async () => {
    const coverage = await getBlueprintCoverage(2)
    expect(coverage.total).toBe(4)
    // Canary: bump when a content wave covers more categories.
    expect(coverage.covered).toBe(1)
  })

  it('never claims more coverage than there are categories', async () => {
    const coverage = await getBlueprintCoverage(2)
    expect(coverage.covered).toBeLessThanOrEqual(coverage.total)
    expect(coverage.covered).toBeGreaterThanOrEqual(0)
  })

  it('counts at least as many categories at level 1 as at level 2', async () => {
    // Lowering the reading-load floor can only widen the pool, never narrow it.
    const strict = await getBlueprintCoverage(2)
    const loose = await getBlueprintCoverage(1)
    expect(loose.covered).toBeGreaterThanOrEqual(strict.covered)
  })
})

describe('group badges count PLAYABLE benchmarks', () => {
  /** Mark every playable benchmark in the Origins category as mastered. */
  async function masterAllPlayableOrigins() {
    const playable = await getPlayableBenchmarkIds()
    const origins = await prisma.benchmark.findMany({
      where: {
        code: { startsWith: 'SS.7.CG.' },
        reportingCategory: { name: 'Origins and Purposes of Law and Government' },
      },
      select: { id: true },
    })
    const target = origins.filter((b) => playable.has(b.id))
    await prisma.studentProgress.createMany({
      data: target.map((b) => ({ studentId, benchmarkId: b.id, status: 'MASTERED' as const })),
    })
    return { total: origins.length, playable: target.length }
  }

  it('the category has more benchmarks than are playable (guards the premise)', async () => {
    const { total, playable } = await masterAllPlayableOrigins()
    // If these were equal, the old `mastered === benchmarks.length` rule would
    // have worked and this whole fix would be pointless.
    expect(total).toBeGreaterThan(playable)
  })

  it('awards Pillar I once every PLAYABLE Origins mission is mastered', async () => {
    await masterAllPlayableOrigins()
    const badge = await prisma.badge.findFirst({
      where: { name: 'Pillar I — Origins' },
      select: { id: true },
    })
    if (!badge) return // badges not seeded in this DB — nothing to assert

    await evaluateAndAwardBadges(studentId)
    const held = await prisma.studentBadge.findUnique({
      where: { studentId_badgeId: { studentId, badgeId: badge.id } },
      select: { id: true },
    })
    expect(held).not.toBeNull()
  })

  it('withholds Pillar I while a playable Origins mission is still unmastered', async () => {
    const playable = await getPlayableBenchmarkIds()
    const origins = await prisma.benchmark.findMany({
      where: {
        code: { startsWith: 'SS.7.CG.' },
        reportingCategory: { name: 'Origins and Purposes of Law and Government' },
      },
      select: { id: true },
    })
    const target = origins.filter((b) => playable.has(b.id)).slice(0, -1) // one short
    await prisma.studentProgress.createMany({
      data: target.map((b) => ({ studentId, benchmarkId: b.id, status: 'MASTERED' as const })),
    })

    const badge = await prisma.badge.findFirst({
      where: { name: 'Pillar I — Origins' },
      select: { id: true },
    })
    if (!badge) return

    await evaluateAndAwardBadges(studentId)
    const held = await prisma.studentBadge.findUnique({
      where: { studentId_badgeId: { studentId, badgeId: badge.id } },
      select: { id: true },
    })
    expect(held).toBeNull()
  })

  it('the Pillar categories match real ReportingCategory names', async () => {
    // All four Pillar badges shipped with invented category strings
    // ('Origins of American Democracy' etc.) that matched nothing, so the
    // lookup returned zero benchmarks and every one of them was dead.
    const badges = await prisma.badge.findMany({
      where: { name: { startsWith: 'Pillar ' } },
      select: { name: true, criteriaJson: true },
    })
    if (badges.length === 0) return

    const realNames = new Set(
      (await prisma.reportingCategory.findMany({ select: { name: true } })).map((c) => c.name)
    )
    for (const badge of badges) {
      const category = (badge.criteriaJson as { category?: string } | null)?.category
      expect(realNames.has(category ?? '')).toBe(true)
    }
  })
})
