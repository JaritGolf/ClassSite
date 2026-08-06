/**
 * Load everything `rankNextSteps` needs for one student.
 *
 * Deliberately the ONLY loader, and deliberately thin: it composes existing
 * domain modules rather than re-deriving anything.
 *
 *   - `getMissionAvailability` / `pickCurrentMissionId`  (src/lib/mastery)
 *   - `getStrategyProgress`                             (src/lib/strategy-track)
 *   - `getLastActivityForStudent`                       (src/lib/student-activity)
 *
 * Re-implementing "which mission is current" here is exactly the mistake the
 * dashboard used to make — it ran its own "first IN_PROGRESS else first
 * NOT_STARTED" query and ended up linking to a mission the map drew as locked.
 */

import { prisma } from '@/lib/db'
import { getMissionAvailability, pickCurrentMissionId } from '@/lib/mastery'
import { getStrategyProgress } from '@/lib/strategy-track'
import { getLastActivityForStudent } from '@/lib/student-activity'
import { buildStudentPlan, type RankInputs } from './rank'
import type { StudentPlan } from './types'

/** Availability states that mean the student finished with a benchmark. */
const TERMINAL_STATES = new Set(['MASTERED', 'EXPOSURE_COMPLETE', 'TEACHER_OVERRIDE'])

export async function loadRankInputs(studentId: string): Promise<RankInputs> {
  const [availability, remediationRow, drillDueCount, strategy, lastActivity] = await Promise.all([
    getMissionAvailability(studentId),
    // Oldest first: if two are assigned, the one that has been waiting longest is
    // the one to clear. (The dashboard previously took the NEWEST, which could
    // leave an older assignment permanently buried.)
    prisma.studentRemediation.findFirst({
      where: { studentId, status: 'ASSIGNED' },
      orderBy: { assignedAt: 'asc' },
      select: {
        id: true,
        benchmarkId: true,
        remediationItem: { select: { title: true } },
      },
    }),
    prisma.spacedReviewState.count({
      where: { studentId, dueAt: { lte: new Date() } },
    }),
    getStrategyProgress(studentId),
    getLastActivityForStudent(studentId),
  ])

  const currentMissionId = pickCurrentMissionId(availability)

  // StudentRemediation has no Benchmark relation (raw benchmarkId), so the
  // context title needs its own lookup.
  const [currentBenchmark, remediationBenchmark] = await Promise.all([
    currentMissionId
      ? prisma.benchmark.findUnique({
          where: { id: currentMissionId },
          select: { code: true, title: true },
        })
      : Promise.resolve(null),
    remediationRow
      ? prisma.benchmark.findUnique({
          where: { id: remediationRow.benchmarkId },
          select: { title: true },
        })
      : Promise.resolve(null),
  ])

  // Whether the Mastery Challenge is already unlocked. Same signal the mission
  // page derives for its resume point — a passed READINESS_CHECK outranks the
  // progress status, which may not have moved yet.
  let readinessPassed = false
  if (currentMissionId) {
    const passed = await prisma.assessmentAttempt.findFirst({
      where: {
        studentId,
        passed: true,
        voided: false,
        assessment: { benchmarkId: currentMissionId, assessmentType: 'READINESS_CHECK' },
      },
      select: { id: true },
    })
    readinessPassed = passed !== null
  }

  let masteredCount = 0
  for (const node of availability.values()) {
    if (TERMINAL_STATES.has(node.state)) masteredCount += 1
  }

  const currentState = currentMissionId ? availability.get(currentMissionId)?.state : undefined

  return {
    remediation: remediationRow
      ? {
          studentRemediationId: remediationRow.id,
          title: remediationRow.remediationItem.title,
          benchmarkTitle: remediationBenchmark?.title ?? null,
        }
      : null,
    mission:
      currentBenchmark && currentState
        ? {
            benchmarkCode: currentBenchmark.code,
            title: currentBenchmark.title,
            state: currentState,
            readinessPassed,
          }
        : null,
    drillDueCount,
    strategyOwed: strategy.totalOwed,
    masteredCount,
    lastActivity: lastActivity
      ? {
          label: lastActivity.label,
          // LastActivityView.subLabel is nullable; the plan always shows a line.
          subLabel: lastActivity.subLabel ?? 'Where you left off last time',
          href: lastActivity.href,
          icon: lastActivity.icon,
        }
      : null,
  }
}

/** Load + rank in one call. This is what every surface uses. */
export async function getStudentPlan(studentId: string): Promise<StudentPlan> {
  return buildStudentPlan(await loadRankInputs(studentId))
}
