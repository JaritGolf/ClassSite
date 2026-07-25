import { requireAuth, getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { recordActivity, getOrCreateStreak } from '@/lib/streak'
import { getFirstUnreadBeat } from '@/lib/narrative'
import { getLastActivityForStudent } from '@/lib/student-activity'
import { DashboardHero } from '@/components/student/dashboard/DashboardHero'
import { ReadinessMeter } from '@/components/student/dashboard/ReadinessMeter'
import { DrillCTA } from '@/components/student/dashboard/DrillCTA'
import { StreakWidget } from '@/components/student/dashboard/StreakWidget'
import { BadgeRack } from '@/components/student/dashboard/BadgeRack'
import { ContinueLastActivity } from '@/components/student/dashboard/ContinueLastActivity'
import { NarrativeOverlayWrapper } from '@/components/student/layout/NarrativeOverlayWrapper'
import { TrackIcon } from '@/components/ui/TrackIcon'

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
    lastActivity,
  ] = await Promise.all([
    prisma.studentProgress.findFirst({
      where: { studentId: student.id, status: 'IN_PROGRESS' },
      include: {
        benchmark: {
          select: { code: true, title: true, unit: { select: { id: true, sequenceOrder: true } } },
        },
      },
      orderBy: { benchmark: { sequenceOrder: 'asc' } },
    }).then(async (row) => {
      if (row) return row
      return prisma.studentProgress.findFirst({
        where: { studentId: student.id, status: 'NOT_STARTED' },
        include: {
          benchmark: {
            select: { code: true, title: true, unit: { select: { id: true, sequenceOrder: true } } },
          },
        },
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
    // Dashboard "pick up where you left off" — genuinely last-touched activity
    getLastActivityForStudent(student.id),
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

  // Narrative beat for the student's CURRENT unit (the unit of their current
  // mission), falling back to the first active unit when they have no progress
  // rows yet — otherwise students in later units would forever see Unit 1 beats.
  let narrativeBeat: { beatKey: string; unitId: string; npcName: string; dialogue: string } | null = null
  const beatUnit = currentMission?.benchmark.unit ?? firstUnit
  if (beatUnit) {
    const unitCode = `unit-${beatUnit.sequenceOrder}`
    const beat = await getFirstUnreadBeat(student.id, beatUnit.id, unitCode)
    if (beat) {
      narrativeBeat = { beatKey: beat.beatKey, unitId: beatUnit.id, npcName: beat.npcName, dialogue: beat.dialogue }
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      {lastActivity && (
        <div className="animate-pop-in">
          <ContinueLastActivity
            activity={{
              label: lastActivity.label,
              subLabel: lastActivity.subLabel,
              href: lastActivity.href,
              icon: lastActivity.icon,
              occurredAt: lastActivity.occurredAt.toISOString(),
            }}
          />
        </div>
      )}
      <div className="animate-pop-in [animation-delay:60ms]">
        <DashboardHero currentMission={missionData} studentName={session.user.name} />
      </div>
      <div className="animate-pop-in [animation-delay:90ms]">
        <ReadinessMeter {...readinessMeter} />
      </div>
      <div className="grid gap-4 animate-pop-in [animation-delay:180ms] sm:grid-cols-2">
        <StreakWidget
          currentLength={streakState.currentLength}
          longestLength={streakState.longestLength}
          freezeTokens={streakState.freezeTokens}
        />
        <DrillCTA drillCount={drillCount} />
      </div>
      {activeRemediation && (
        <a
          href={`/student/remediation/${activeRemediation.id}`}
          className="block rounded-2xl border-2 border-amber-200 bg-white p-5 shadow-card transition-colors hover:border-amber-300 hover:bg-amber-50 animate-pop-in [animation-delay:270ms]"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-amber-950">
              <TrackIcon name="target" className="h-6 w-6" />
            </span>
            <div>
              <p className="font-display text-xs font-bold uppercase tracking-widest text-amber-700">
                Training Mission
              </p>
              <p className="font-display text-base font-bold text-gray-900">
                {activeRemediation.remediationItem.title}
              </p>
              <p className="text-sm text-amber-800">Tap to strengthen this skill →</p>
            </div>
          </div>
        </a>
      )}
      <div className="animate-pop-in [animation-delay:360ms]">
        <BadgeRack badges={badges} />
      </div>
      <NarrativeOverlayWrapper beat={narrativeBeat} />
    </div>
  )
}
