import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { recordActivity } from '@/lib/streak'
import { touchActivitySafe } from '@/lib/activity-sessions'
import { getFirstUnreadBeat } from '@/lib/narrative'
import { getMissionAvailability, pickCurrentMissionId } from '@/lib/mastery'
import { getStudentPlan } from '@/lib/student-next-step'
import { getStudentCheckpoints } from '@/lib/progress-checkpoints'
import { CheckpointCard } from '@/components/student/dashboard/CheckpointCard'
import { NextStepCard } from '@/components/student/dashboard/NextStepCard'
import { ThenList } from '@/components/student/dashboard/ThenList'
import { ReadinessMeter } from '@/components/student/dashboard/ReadinessMeter'
import { StreakWidget } from '@/components/student/dashboard/StreakWidget'
import { BadgeRack } from '@/components/student/dashboard/BadgeRack'
import { NarrativeOverlayWrapper } from '@/components/student/layout/NarrativeOverlayWrapper'

/**
 * The student's home base.
 *
 * ── What changed and why ─────────────────────────────────────────────────────
 * This page used to render FOUR calls-to-action of near-identical visual weight
 * — "Pick up where you left off" (ContinueLastActivity), "Continue Mission"
 * (DashboardHero), "Start Drill" (DrillCTA), and an assigned-remediation card —
 * with nothing ranking them. Two of them were near-duplicates of each other. A
 * 12-year-old was not guided; they guessed.
 *
 * Now there is one ranked answer from `getStudentPlan`, rendered as one dominant
 * NextStepCard plus a quiet ordered ThenList, with progress widgets demoted
 * below. The three superseded components were deleted rather than left to drift.
 */
export default async function StudentDashboard() {
  const session = await requireAuth(['STUDENT'])

  const student = await prisma.student.findUnique({
    where: { userId: session.user.userId },
    select: { id: true },
  })

  if (!student) {
    return (
      <div className="p-8 text-center text-gray-500">
        Student record not found. Please contact your teacher.
      </div>
    )
  }

  const [plan, availability, recentBadges, masteredCount, totalCount, firstUnit] =
    await Promise.all([
      // The single source of "what should this student do next", shared with
      // every terminal screen (assessment complete, drill done, remediation
      // done, in-mission debrief) so they cannot disagree.
      getStudentPlan(student.id),
      // Loaded again here on purpose: the narrative beat needs the current
      // mission's UNIT, which the plan deliberately does not carry (it is a
      // client-facing wire contract, not a progress dump). Three cheap indexed
      // reads is a better trade than widening that contract.
      getMissionAvailability(student.id),
      prisma.studentBadge.findMany({
        where: { studentId: student.id },
        orderBy: { awardedAt: 'desc' },
        take: 3,
        include: { badge: { select: { name: true, iconKey: true, description: true } } },
      }),
      prisma.studentProgress.count({ where: { studentId: student.id, status: 'MASTERED' } }),
      prisma.benchmark.count(),
      prisma.unit.findFirst({
        where: { active: true },
        orderBy: { sequenceOrder: 'asc' },
        select: { id: true, sequenceOrder: true },
      }),
    ])

  const streakState = await recordActivity(student.id, new Date())
  await touchActivitySafe(student.id, { area: 'dashboard' })

  // Current nine-week checkpoint standing (display only — never gates anything).
  const { current: currentCheckpoint } = await getStudentCheckpoints(student.id)

  const pct = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0
  const readinessMeter = { pct, ciLow: Math.max(0, pct - 5), ciHigh: Math.min(100, pct + 5) }

  const badges = recentBadges.map((sb) => ({
    id: sb.id,
    name: sb.badge.name,
    iconKey: sb.badge.iconKey,
    description: sb.badge.description,
  }))

  // Narrative beat for the student's CURRENT unit (the unit of their current
  // mission), falling back to the first active unit when they have no progress
  // rows yet — otherwise students in later units would forever see Unit 1 beats.
  const currentMissionId = pickCurrentMissionId(availability)
  const currentMissionUnit = currentMissionId
    ? (
        await prisma.benchmark.findUnique({
          where: { id: currentMissionId },
          select: { unit: { select: { id: true, sequenceOrder: true } } },
        })
      )?.unit ?? null
    : null

  let narrativeBeat: { beatKey: string; unitId: string; npcName: string; dialogue: string } | null =
    null
  const beatUnit = currentMissionUnit ?? firstUnit
  if (beatUnit) {
    const unitCode = `unit-${beatUnit.sequenceOrder}`
    const beat = await getFirstUnreadBeat(student.id, beatUnit.id, unitCode)
    if (beat) {
      narrativeBeat = {
        beatKey: beat.beatKey,
        unitId: beatUnit.id,
        npcName: beat.npcName,
        dialogue: beat.dialogue,
      }
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <div className="animate-pop-in">
        <NextStepCard step={plan.primary} studentName={session.user.name} />
      </div>

      {plan.then.length > 0 && (
        <div className="animate-pop-in [animation-delay:90ms]">
          <ThenList steps={plan.then} />
        </div>
      )}

      {/* Everything below is status, not a call to action. Kept visually quieter
          so it cannot compete with the step above for the first click. */}
      <div className="pt-4 animate-pop-in [animation-delay:180ms]">
        <h2 className="px-1 font-display text-xs font-bold uppercase tracking-widest text-indigo-700">
          Your progress
        </h2>
        <div className="mt-2 space-y-4">
          <ReadinessMeter {...readinessMeter} />
          {currentCheckpoint && (
            <CheckpointCard
              checkpointNumber={currentCheckpoint.checkpointNumber}
              endsOn={currentCheckpoint.endsOn}
              level={currentCheckpoint.level}
              maxLevel={currentCheckpoint.maxLevel}
              nextLevel={currentCheckpoint.nextLevel}
              missionsToNextLevel={currentCheckpoint.missionsToNextLevel}
              missionsPastTopTarget={currentCheckpoint.missionsPastTopTarget}
            />
          )}
          <StreakWidget
            currentLength={streakState.currentLength}
            longestLength={streakState.longestLength}
            freezeTokens={streakState.freezeTokens}
          />
          <BadgeRack badges={badges} />
        </div>
      </div>

      <NarrativeOverlayWrapper beat={narrativeBeat} />
    </div>
  )
}
