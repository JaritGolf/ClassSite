/**
 * Which missions are PLAYABLE — a curriculum fact, the same for everyone.
 *
 * A benchmark is playable when the teacher has marked it ready AND it has the
 * content a mission needs (an approved Mastery Challenge form with questions,
 * and an approved lesson). Whether a particular student has reached it is
 * decided on that student's device (./availability-core) from progress the
 * server never sees.
 */

import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'

/** The one definition of "playable". ANDed gates — the flag never replaces the content check. */
export const PLAYABLE_BENCHMARK_WHERE = {
  readyForStudents: true,
  assessments: {
    some: {
      assessmentType: 'MASTERY_CHALLENGE',
      approvalStatus: 'APPROVED',
      questions: { some: {} },
    },
  },
  lessons: { some: { approvalStatus: 'APPROVED' } },
} satisfies Prisma.BenchmarkWhereInput

export async function getPlayableBenchmarkIds(): Promise<Set<string>> {
  const rows = await prisma.benchmark.findMany({
    where: { ...PLAYABLE_BENCHMARK_WHERE, unit: { active: true } },
    select: { id: true },
  })
  return new Set(rows.map((r) => r.id))
}
