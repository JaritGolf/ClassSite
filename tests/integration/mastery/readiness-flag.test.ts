/**
 * Teacher control over whether a mission is open to students.
 *
 * `Benchmark.readyForStudents` defaults to false, so without an in-app control a
 * newly seeded benchmark stays invisible and the only way to open it is hand-
 * written SQL. This covers the domain layer behind that control.
 *
 * ⚠ These tests mutate a SHARED, GLOBAL row — Benchmark is curriculum, not
 * per-student data, and `getPlayableBenchmarkIds` reads it. afterEach restores
 * the original value. Leaving a benchmark flipped would silently change what
 * every other suite considers playable, which is the exact fixture-leak shape
 * that has broken this suite before.
 *
 * Prefix: test-ready- (isolated from other suites + auth cleanup).
 */

import { PrismaClient } from '@prisma/client'
import {
  setBenchmarkReadiness,
  getBenchmarkReadiness,
  getPlayableBenchmarkIds,
  ReadinessFlagError,
} from '@/lib/mastery'

const prisma = new PrismaClient()
const PREFIX = 'test-ready-'
const TEACHER_CLEVER_ID = `${PREFIX}teacher-001`

/** A benchmark that ships ready AND content-backed. */
const READY_CODE = 'SS.7.CG.1.1'
/** A benchmark with no authored mastery form — content-less by design. */
const CONTENTLESS_CODE = 'SS.7.CG.1.8'

let teacherUserId: string
let readyBenchmarkId: string
let contentlessBenchmarkId: string
const originalFlags = new Map<string, boolean>()

beforeAll(async () => {
  const user = await prisma.user.upsert({
    where: { cleverId: TEACHER_CLEVER_ID },
    update: {},
    create: {
      cleverId: TEACHER_CLEVER_ID,
      role: 'TEACHER',
      firstName: 'Ready',
      lastName: 'Probe',
      status: 'ACTIVE',
    },
    select: { id: true },
  })
  teacherUserId = user.id

  for (const code of [READY_CODE, CONTENTLESS_CODE]) {
    const b = await prisma.benchmark.findUnique({
      where: { code },
      select: { id: true, readyForStudents: true },
    })
    if (!b) throw new Error(`Seeded benchmark ${code} not found — run npm run db:seed`)
    originalFlags.set(b.id, b.readyForStudents)
    if (code === READY_CODE) readyBenchmarkId = b.id
    else contentlessBenchmarkId = b.id
  }
})

afterEach(async () => {
  // Restore the shared curriculum rows before the next test or suite reads them.
  for (const [id, readyForStudents] of originalFlags) {
    await prisma.benchmark.update({ where: { id }, data: { readyForStudents } })
  }
  await prisma.auditLog.deleteMany({ where: { actorUserId: teacherUserId } })
})

afterAll(async () => {
  for (const [id, readyForStudents] of originalFlags) {
    await prisma.benchmark.update({ where: { id }, data: { readyForStudents } })
  }
  await prisma.auditLog.deleteMany({ where: { actorUserId: teacherUserId } })
  await prisma.user.deleteMany({ where: { cleverId: TEACHER_CLEVER_ID } })
  await prisma.$disconnect()
})

describe('getBenchmarkReadiness', () => {
  it('reports the flag and whether content actually backs each benchmark', async () => {
    const rows = await getBenchmarkReadiness()
    const ready = rows.find((r) => r.code === READY_CODE)!
    expect(ready.readyForStudents).toBe(true)
    expect(ready.hasContent).toBe(true)
    expect(ready.playable).toBe(true)
  })

  it('separates "switched on" from "has content"', async () => {
    // The distinction the UI depends on: a content-less benchmark must not offer
    // a switch that appears to do nothing.
    const rows = await getBenchmarkReadiness()
    const contentless = rows.find((r) => r.code === CONTENTLESS_CODE)!
    expect(contentless.hasContent).toBe(false)
    expect(contentless.playable).toBe(false)
  })

  it('returns benchmarks in curriculum order', async () => {
    const rows = await getBenchmarkReadiness()
    const codes = rows.map((r) => r.code)
    expect(codes).toEqual([...codes].sort((a, b) => {
      const n = (c: string) => Number(c.split('.').pop())
      return n(a) - n(b)
    }))
  })
})

describe('setBenchmarkReadiness', () => {
  it('withholds a mission and removes it from the playable set', async () => {
    await setBenchmarkReadiness(teacherUserId, readyBenchmarkId, false)
    const playable = await getPlayableBenchmarkIds()
    expect(playable.has(readyBenchmarkId)).toBe(false)
  })

  it('opens it again and restores it to the playable set', async () => {
    await setBenchmarkReadiness(teacherUserId, readyBenchmarkId, false)
    await setBenchmarkReadiness(teacherUserId, readyBenchmarkId, true)
    const playable = await getPlayableBenchmarkIds()
    expect(playable.has(readyBenchmarkId)).toBe(true)
  })

  it('cannot make a content-less benchmark playable', async () => {
    // The flag is an ADDITIONAL gate, never a replacement. Switching on a
    // benchmark with no lesson must not put an empty mission in front of a kid.
    await setBenchmarkReadiness(teacherUserId, contentlessBenchmarkId, true)
    const playable = await getPlayableBenchmarkIds()
    expect(playable.has(contentlessBenchmarkId)).toBe(false)
  })

  it('writes an audit row recording the before and after', async () => {
    await setBenchmarkReadiness(teacherUserId, readyBenchmarkId, false)
    const log = await prisma.auditLog.findFirst({
      where: { actorUserId: teacherUserId, action: 'BENCHMARK_READINESS_SET' },
      orderBy: { createdAt: 'desc' },
      select: { entityType: true, entityId: true, metadataJson: true },
    })
    expect(log).not.toBeNull()
    expect(log!.entityType).toBe('Benchmark')
    expect(log!.entityId).toBe(readyBenchmarkId)
    expect(log!.metadataJson).toMatchObject({
      benchmarkCode: READY_CODE,
      before: true,
      after: false,
    })
  })

  it('is idempotent — setting the same value twice is harmless', async () => {
    await setBenchmarkReadiness(teacherUserId, readyBenchmarkId, true)
    const result = await setBenchmarkReadiness(teacherUserId, readyBenchmarkId, true)
    expect(result.readyForStudents).toBe(true)
  })

  it('throws NOT_FOUND for an unknown benchmark rather than writing anything', async () => {
    await expect(
      setBenchmarkReadiness(teacherUserId, 'no-such-benchmark-id', true)
    ).rejects.toBeInstanceOf(ReadinessFlagError)

    const strays = await prisma.auditLog.count({ where: { actorUserId: teacherUserId } })
    expect(strays).toBe(0)
  })
})
