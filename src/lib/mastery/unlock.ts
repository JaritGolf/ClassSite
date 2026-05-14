/**
 * Unlock the next benchmark in sequence for a student.
 *
 * Called after a student masters a benchmark. Finds the next benchmark
 * in the same unit by sequenceOrder and creates a NOT_STARTED
 * StudentProgress row if one does not already exist.
 */

import { prisma } from '@/lib/db'

/**
 * Unlock the next benchmark for the student by creating a NOT_STARTED
 * StudentProgress row for it.
 *
 * @param studentId           - The Student.id of the student
 * @param masteredBenchmarkId - The Benchmark.id of the just-mastered benchmark
 * @returns true if a new unlock row was created, false if already exists or
 *          there is no next benchmark in the unit
 */
export async function unlockNextBenchmark(
  studentId: string,
  masteredBenchmarkId: string
): Promise<boolean> {
  // Load the mastered benchmark to get its position in the unit
  const mastered = await prisma.benchmark.findUnique({
    where: { id: masteredBenchmarkId },
    select: { sequenceOrder: true, unitId: true },
  })

  if (!mastered) return false

  // Find the next benchmark in the same unit by sequenceOrder
  const next = await prisma.benchmark.findFirst({
    where: {
      unitId: mastered.unitId,
      sequenceOrder: { gt: mastered.sequenceOrder },
    },
    orderBy: { sequenceOrder: 'asc' },
    select: { id: true },
  })

  if (!next) {
    // No next benchmark — this is the last one in the unit
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
