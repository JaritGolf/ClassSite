/**
 * Teacher control over whether a mission is open to students.
 *
 * `Benchmark.readyForStudents` is one half of the playability rule (see
 * PLAYABLE_BENCHMARK_WHERE in ./availability). The other half is the content
 * check — an approved mastery form with questions, and an approved lesson.
 * BOTH must hold, so this switch can only ever withhold a mission, never push
 * an empty one in front of a student.
 *
 * It exists because content in this course is seeded piecemeal on purpose: the
 * build scope is deliberately limited while the platform is validated. Inferring
 * readiness from "some rows exist" would put a draft lesson in front of a
 * 12-year-old the moment it seeds. The teacher decides when a mission is ready.
 *
 * The column defaults to false, so without this control a newly seeded benchmark
 * would stay invisible with no in-app way to open it.
 */

import { prisma } from '@/lib/db'

export class ReadinessFlagError extends Error {
  constructor(
    message: string,
    public readonly code: 'NOT_FOUND'
  ) {
    super(message)
    this.name = 'ReadinessFlagError'
  }
}

export interface BenchmarkReadiness {
  benchmarkId: string
  code: string
  title: string
  readyForStudents: boolean
  /** Whether content backs this benchmark, independent of the flag. */
  hasContent: boolean
  /** Ready AND content-backed — i.e. a student can actually play it. */
  playable: boolean
}

/**
 * Set (or clear) the ready flag on one benchmark.
 *
 * Writes an audit row in the same transaction as the update, matching how every
 * other teacher-facing content mutation in this codebase behaves — a change to
 * what students can see should never be untraceable.
 *
 * Deliberately NOT roster-guarded: a Benchmark is shared curriculum, not a
 * student record, so there is no roster to scope it to. Authorization is the
 * TEACHER/ADMIN role plus the substitute-mode write gate on the route.
 */
export async function setBenchmarkReadiness(
  actorUserId: string,
  benchmarkId: string,
  readyForStudents: boolean
): Promise<{ auditLogId: string; readyForStudents: boolean }> {
  const benchmark = await prisma.benchmark.findUnique({
    where: { id: benchmarkId },
    select: { id: true, code: true, readyForStudents: true },
  })
  if (!benchmark) {
    throw new ReadinessFlagError(`Benchmark ${benchmarkId} not found`, 'NOT_FOUND')
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.benchmark.update({
      where: { id: benchmarkId },
      data: { readyForStudents },
    })

    return tx.auditLog.create({
      data: {
        actorUserId,
        action: 'BENCHMARK_READINESS_SET',
        entityType: 'Benchmark',
        entityId: benchmarkId,
        metadataJson: {
          benchmarkCode: benchmark.code,
          before: benchmark.readyForStudents,
          after: readyForStudents,
        },
      },
      select: { id: true },
    })
  })

  return { auditLogId: result.id, readyForStudents }
}

/**
 * Every benchmark with its flag and whether content actually backs it.
 *
 * Both facts are returned because the flag alone is misleading: a benchmark can
 * be switched on and still be unplayable because no lesson is authored yet. The
 * teacher UI shows the real reason rather than a switch that appears to do
 * nothing.
 */
export async function getBenchmarkReadiness(): Promise<BenchmarkReadiness[]> {
  const rows = await prisma.benchmark.findMany({
    where: { unit: { active: true }, code: { startsWith: 'SS.7.CG.' } },
    orderBy: { sequenceOrder: 'asc' },
    select: {
      id: true,
      code: true,
      title: true,
      readyForStudents: true,
      assessments: {
        where: {
          assessmentType: 'MASTERY_CHALLENGE',
          approvalStatus: 'APPROVED',
          questions: { some: {} },
        },
        select: { id: true },
        take: 1,
      },
      lessons: { where: { approvalStatus: 'APPROVED' }, select: { id: true }, take: 1 },
    },
  })

  return rows.map((b) => {
    const hasContent = b.assessments.length > 0 && b.lessons.length > 0
    return {
      benchmarkId: b.id,
      code: b.code,
      title: b.title,
      readyForStudents: b.readyForStudents,
      hasContent,
      playable: b.readyForStudents && hasContent,
    }
  })
}
