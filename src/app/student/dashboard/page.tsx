import { requireAuth, getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { recordActivity, getOrCreateStreak } from '@/lib/streak'
import { getFirstUnreadBeat } from '@/lib/narrative'
import { DashboardHero } from '@/components/student/dashboard/DashboardHero'
import { ReadinessMeter } from '@/components/student/dashboard/ReadinessMeter'
import { DrillCTA } from '@/components/student/dashboard/DrillCTA'
import { StreakWidget } from '@/components/student/dashboard/StreakWidget'
import { BadgeRack } from '@/components/student/dashboard/BadgeRack'
import { NarrativeOverlayWrapper } from '@/components/student/layout/NarrativeOverlayWrapper'

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

  const [
    currentMission,
    drillCount,
    recentBadges,
    masteredCount,
    totalCount,
    firstUnit,
    activeRemediation,
  ] = await Promise.all([
    prisma.studentProgress.findFirst({
      where: { studentId: student.id, status: 'IN_PROGRESS' },
      include: { benchmark: { select: { code: true, title: true } } },
      orderBy: { benchmark: { sequenceOrder: 'asc' } },
    }).then(async (row) => {
      if (row) return row
      return prisma.studentProgress.findFirst({
        where: { studentId: student.id, status: 'NOT_STARTED' },
        include: { benchmark: { select: { code: true, title: true } } },
        orderBy: { benchmark: { sequenceOrder: 'asc' } },
      })
    }),
    prisma.spacedReviewState.count({
      where: { studentId: student.id, dueAt: { lte: new Date() } },
    }),
    prisma.studentBadge.findMany({
      where: { studentId: student.id },
      orderBy: { awardedAt: 'desc' },
      take: 3,
      include: { badge: { select: { name: true, iconKey: true, description: true } } },
    }),
    prisma.studentProgress.count({ where: { studentId: student.id, status: 'MASTERED' } }),
    prisma.benchmark.count(),
    // Get the first unit (for narrative beats on the dashboard)
    prisma.unit.findFirst({ where: { active: true }, orderBy: { sequenceOrder: 'asc' }, select: { id: true, sequenceOrder: true } }),
    // Current remediation task, if any (spec §21.3)
    prisma.studentRemediation.findFirst({
      where: { studentId: student.id, status: 'ASSIGNED' },
      orderBy: { assignedAt: 'desc' },
      include: { remediationItem: { select: { title: true } } },
    }),
  ])

  const streakState = await recordActivity(student.id, new Date())

  const pct = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0
  const readinessMeter = { pct, ciLow: Math.max(0, pct - 5), ciHigh: Math.min(100, pct + 5) }

  const missionData = currentMission
    ? { benchmarkCode: currentMission.benchmark.code, title: currentMission.benchmark.title, status: currentMission.status }
    : null

  const badges = recentBadges.map((sb) => ({
    id: sb.id,
    name: sb.badge.name,
    iconKey: sb.badge.iconKey,
    description: sb.badge.description,
  }))

  // Narrative beat for the first active unit
  let narrativeBeat: { beatKey: string; unitId: string; npcName: string; dialogue: string } | null = null
  if (firstUnit) {
    const unitCode = `unit-${firstUnit.sequenceOrder}`
    const beat = await getFirstUnreadBeat(student.id, firstUnit.id, unitCode)
    if (beat) {
      narrativeBeat = { beatKey: beat.beatKey, unitId: firstUnit.id, npcName: beat.npcName, dialogue: beat.dialogue }
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-4">
      <DashboardHero currentMission={missionData} studentName={session.user.name} />
      <ReadinessMeter {...readinessMeter} />
      <StreakWidget
        currentLength={streakState.currentLength}
        longestLength={streakState.longestLength}
        freezeTokens={streakState.freezeTokens}
      />
      <DrillCTA drillCount={drillCount} />
      {activeRemediation && (
        <a
          href={`/student/remediation/${activeRemediation.id}`}
          className="block rounded-xl border border-amber-300 bg-amber-50 p-4 hover:bg-amber-100 transition-colors"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Training Mission</p>
          <p className="text-sm font-semibold text-amber-900">
            {activeRemediation.remediationItem.title}
          </p>
          <p className="text-xs text-amber-700">Tap to strengthen this skill →</p>
        </a>
      )}
      <BadgeRack badges={badges} />
      <NarrativeOverlayWrapper beat={narrativeBeat} />
    </div>
  )
}
