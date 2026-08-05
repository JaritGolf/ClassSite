/**
 * Unlock the next benchmark in sequence for a student.
 *
 * Called after a student masters (or off-ramps) a benchmark. Finds the next
 * *reachable* benchmark by global sequence order and creates a NOT_STARTED
 * StudentProgress row if one does not already exist.
 *
 * "Reachable" deliberately means more than "the next row in the table":
 *
 *   - It crosses UNIT boundaries. This used to be scoped to `unitId`, which
 *     walled every student at the last benchmark of their unit — mastering
 *     SS.7.CG.1.6 unlocked nothing at all.
 *   - It skips units that are not `active` (no content authored yet).
 *   - It skips benchmarks with no APPROVED MASTERY_CHALLENGE. Some benchmarks
 *     have an empty question bank (seed/assessments.ts skips them), which makes
 *     them impossible to master AND impossible to off-ramp — off-ramp requires
 *     3 failed Mastery Challenge attempts. Parking a student there is a dead end.
 *   - It filters on the `SS.7.CG.` code prefix. `Benchmark.sequenceOrder` has no
 *     unique constraint and several test suites insert fixture benchmarks at
 *     sequenceOrder 9995-9999, which a bare global search would happily jump to.
 *
 * Benchmark.sequenceOrder is globally sequential 1..36 across all units (pinned
 * by tests/unit/seed/benchmark-standards-alignment.test.ts), so a single ordered
 * lookup is sufficient — no per-unit hop needed.
 *
 * Known limitation: activating a unit later does not retroactively unlock. A
 * student already parked at the last reachable benchmark is not advanced when new
 * content ships; the teacher's UNLOCK_BENCHMARK override covers that case.
 */

import { prisma } from '@/lib/db'

/** Only these benchmarks participate in the student-facing progression. */
const BENCHMARK_CODE_PREFIX = 'SS.7.CG.'

/**
 * Find the next reachable benchmark after a given sequence position.
 * Exported so callers (e.g. first-mission bootstrap) can share the definition
 * of "reachable" rather than re-implementing the filter.
 *
 * @param afterSequenceOrder - Exclusive lower bound; pass 0 for "the first one"
 */
export async function findNextReachableBenchmark(
  afterSequenceOrder: number
): Promise<{ id: string; code: string; title: string; sequenceOrder: number } | null> {
  return prisma.benchmark.findFirst({
    where: {
      sequenceOrder: { gt: afterSequenceOrder },
      code: { startsWith: BENCHMARK_CODE_PREFIX },
      unit: { active: true },
      assessments: {
        some: {
          assessmentType: 'MASTERY_CHALLENGE',
          approvalStatus: 'APPROVED',
        },
      },
    },
    orderBy: { sequenceOrder: 'asc' },
    select: { id: true, code: true, title: true, sequenceOrder: true },
  })
}

/**
 * Unlock the next benchmark for the student by creating a NOT_STARTED
 * StudentProgress row for it.
 *
 * @param studentId           - The Student.id of the student
 * @param masteredBenchmarkId - The Benchmark.id of the just-cleared benchmark
 * @returns true if a new unlock row was created, false if already present or
 *          there is no further reachable benchmark
 */
export async function unlockNextBenchmark(
  studentId: string,
  masteredBenchmarkId: string
): Promise<boolean> {
  // Load the cleared benchmark to get its position in the sequence
  const mastered = await prisma.benchmark.findUnique({
    where: { id: masteredBenchmarkId },
    select: { sequenceOrder: true },
  })

  if (!mastered) return false

  const next = await findNextReachableBenchmark(mastered.sequenceOrder)

  if (!next) {
    // No further reachable benchmark — end of the authored course
    return false
  }

  // Try to create a NOT_STARTED row; skip if it already exists (P2002)
  try {
    await prisma.studentProgress.create({
      data: {
        studentId,
        benchmarkId: next.id,
        status: 'NOT_STARTED',
      },
    })
    return true
  } catch (err: unknown) {
    // Unique constraint violation — already unlocked
    if (
      err instanceof Error &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      return false
    }
    throw err
  }
}
