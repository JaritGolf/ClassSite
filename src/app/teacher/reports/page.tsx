import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { getTeacherRoster } from '@/lib/teacher-roster'
import {
  getClassMasteryByBenchmark,
  getClassMasteryByReportingCategory,
} from '@/lib/class-analytics'
import { buildDailyClassReport } from '@/lib/daily-report'
import { getClassSessionActivity } from '@/lib/activity-sessions'
import { EmptyState } from '@/components/teacher/shared/EmptyState'
import { StatCard } from '@/components/teacher/dashboard/StatCard'
import { ReportActions } from '@/components/teacher/reports/ReportActions'
import { ClassPicker } from '@/components/teacher/reports/ClassPicker'
import { DailyActionPlan } from '@/components/teacher/reports/DailyActionPlan'
import { DailyRosterTable } from '@/components/teacher/reports/DailyRosterTable'
import {
  DateRangePicker,
  type RangeValue,
} from '@/components/teacher/reports/DateRangePicker'
import { LivePresencePanel } from '@/components/teacher/reports/LivePresencePanel'
import { SessionActivityTable } from '@/components/teacher/reports/SessionActivityTable'
import {
  SessionDetailList,
  SessionLegend,
} from '@/components/teacher/reports/SessionDetailList'

type Tab = 'daily' | 'mastery' | 'activity'

interface ReportsPageProps {
  searchParams: { tab?: string; classId?: string; range?: string }
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])
  const userId = session.user.userId
  const roster = await getTeacherRoster(userId)

  const hasStudents = roster.allStudentIds.length > 0
  const tab: Tab =
    searchParams.tab === 'mastery'
      ? 'mastery'
      : searchParams.tab === 'activity'
        ? 'activity'
        : 'daily'

  // Resolve the selected class (default: first class the teacher owns).
  const classes = roster.classes
  const requestedClassId = searchParams.classId
  const selectedClass =
    classes.find((c) => c.id === requestedClassId) ?? classes[0] ?? null
  const selectedClassId = selectedClass?.id ?? ''

  return (
    <div className="space-y-6 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <ReportActions />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 print:hidden">
        <TabLink
          href={`/teacher/reports?tab=daily${selectedClassId ? `&classId=${selectedClassId}` : ''}`}
          active={tab === 'daily'}
          label="Daily Plan"
        />
        <TabLink
          href="/teacher/reports?tab=mastery"
          active={tab === 'mastery'}
          label="Mastery Reports"
        />
        <TabLink
          href={`/teacher/reports?tab=activity${selectedClassId ? `&classId=${selectedClassId}` : ''}`}
          active={tab === 'activity'}
          label="Activity"
        />
      </div>

      {!hasStudents ? (
        <EmptyState
          title="No students enrolled"
          body="Enroll students in your classes to generate reports."
        />
      ) : tab === 'daily' ? (
        <DailyTab
          userId={userId}
          classes={classes}
          selectedClassId={selectedClassId}
        />
      ) : tab === 'activity' ? (
        <ActivityTab
          userId={userId}
          classes={classes}
          selectedClassId={selectedClassId}
          range={resolveRangeValue(searchParams.range)}
        />
      ) : (
        <MasteryTab userId={userId} />
      )}
    </div>
  )
}

function TabLink({
  href,
  active,
  label,
}: {
  href: string
  active: boolean
  label: string
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? 'border-b-2 border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-700'
          : 'border-b-2 border-transparent px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700'
      }
    >
      {label}
    </Link>
  )
}

// ── Daily Plan tab ─────────────────────────────────────────────────────────

async function DailyTab({
  userId,
  classes,
  selectedClassId,
}: {
  userId: string
  classes: Array<{ id: string; name: string; period: string | null; studentCount?: number; studentIds: string[] }>
  selectedClassId: string
}) {
  if (!selectedClassId) {
    return (
      <EmptyState
        title="No classes yet"
        body="Create a class and enroll students to see a daily plan."
      />
    )
  }

  const report = await buildDailyClassReport(userId, selectedClassId)
  const { classInfo, counts, readiness } = report
  const generated = report.generatedAt.toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  const pickerClasses = classes.map((c) => ({
    id: c.id,
    name: c.name,
    period: c.period,
    studentCount: c.studentIds.length,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ClassPicker classes={pickerClasses} selectedClassId={selectedClassId} />
        <p className="text-xs text-gray-500">
          {classInfo.studentCount} students · updated {generated}
        </p>
      </div>

      {classInfo.subPrepNotes && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <span className="font-semibold">Sub / prep notes: </span>
          {classInfo.subPrepNotes}
        </div>
      )}

      {/* At-a-glance */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="EOC Readiness"
          value={readiness ? `${Math.round(readiness.overallPercent)}%` : '—'}
          explain="This class's blueprint-weighted EOC readiness estimate, averaged across the four reporting categories. An estimate of exam preparedness, not a grade."
        />
        <StatCard
          label="Needs attention"
          value={counts.flaggedStudents}
          alert={counts.flaggedStudents > 0 ? 'warn' : undefined}
          subtext="students with 1+ flag"
          explain="Students carrying at least one flag today: off-ramp, intervention, decay, overdue remediation, overconfidence, or a large drill backlog."
        />
        <StatCard
          label="Off-ramp"
          value={counts.offRampStudents}
          alert={counts.offRampStudents > 0 ? 'critical' : undefined}
          explain="Students who hit the off-ramp on a benchmark (3 failed mastery attempts + remediation + 7 days). The next benchmark unlocks automatically; this is a check-in."
        />
        <StatCard
          label="Remediation overdue"
          value={counts.remediationOverdueStudents}
          alert={counts.remediationOverdueStudents > 0 ? 'warn' : undefined}
          explain="Students with review activities assigned more than 7 days ago that are still not completed."
        />
        <StatCard
          label="Drill items due"
          value={counts.drillItemsDue}
          explain="Total spaced-review items across the class that are due today or overdue. Students clear these via the Daily Republic Drill."
        />
      </div>

      {/* Action plan */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Address today
          </h2>
          <p className="text-sm text-gray-500">
            Prioritized for this class — most urgent first.
          </p>
        </div>
        <DailyActionPlan items={report.actionPlan} />
      </section>

      {/* Per-student roster */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Every student
        </h2>
        <DailyRosterTable roster={report.roster} />
      </section>
    </div>
  )
}

// ── Activity tab (session monitoring, class-scoped) ────────────────────────

function resolveRangeValue(raw: string | undefined): RangeValue {
  return raw === 'today' || raw === '30d' ? raw : '7d'
}

/** Resolve a range token to concrete bounds. Days start at local midnight. */
function resolveRangeBounds(range: RangeValue): { from: Date; to: Date } {
  const to = new Date()
  const from = new Date(to)
  from.setHours(0, 0, 0, 0)
  if (range === '7d') from.setDate(from.getDate() - 6)
  if (range === '30d') from.setDate(from.getDate() - 29)
  return { from, to }
}

function formatMinutesTotal(minutes: number): string {
  if (minutes <= 0) return '0m'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

async function ActivityTab({
  userId,
  classes,
  selectedClassId,
  range,
}: {
  userId: string
  classes: Array<{
    id: string
    name: string
    period: string | null
    studentIds: string[]
  }>
  selectedClassId: string
  range: RangeValue
}) {
  if (!selectedClassId) {
    return (
      <EmptyState
        title="No classes yet"
        body="Create a class and enroll students to see session activity."
      />
    )
  }

  const bounds = resolveRangeBounds(range)
  const report = await getClassSessionActivity(userId, selectedClassId, bounds)
  const { totals, summaries } = report

  const pickerClasses = classes.map((c) => ({
    id: c.id,
    name: c.name,
    period: c.period,
    studentCount: c.studentIds.length,
  }))

  const detailStudents = summaries
    .filter((s) => s.sessionCount > 0)
    .map((s) => ({
      studentId: s.studentId,
      displayName: s.displayName,
      sessions: report.sessionsByStudent[s.studentId] ?? [],
    }))

  const rangeLabel =
    range === 'today'
      ? 'today'
      : range === '30d'
        ? 'the last 30 days'
        : 'the last 7 days'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <ClassPicker
            classes={pickerClasses}
            selectedClassId={selectedClassId}
            tab="activity"
          />
          <DateRangePicker selected={range} />
        </div>
        <a
          href={`/api/teacher/reports/export?type=activity&classId=${selectedClassId}&range=${range}`}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Download CSV
        </a>
      </div>

      {/* Live, for mid-class monitoring */}
      <LivePresencePanel classId={selectedClassId} />

      {/* At-a-glance for the range */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Students active"
          value={`${totals.studentsWithActivity} of ${report.classInfo.studentCount}`}
          subtext={rangeLabel}
          explain="How many students in this class did any work on the platform during the selected range."
        />
        <StatCard
          label="No activity"
          value={totals.studentsWithNoActivity}
          alert={totals.studentsWithNoActivity > 0 ? 'warn' : undefined}
          subtext="students never logged on"
          explain="Students with zero recorded activity in this range. Worth checking whether they can sign in at all."
        />
        <StatCard
          label="Total active time"
          value={formatMinutesTotal(totals.totalActiveMinutes)}
          subtext={`${totals.sessionCount} sessions`}
          explain="Engaged minutes summed across the whole class. Idle time and time with the tab in the background are excluded."
        />
        <StatCard
          label="Median session"
          value={formatMinutesTotal(totals.medianSessionMinutes)}
          explain="The midpoint session length across the class — a better sense of a typical work session than the average, which one long session can distort."
        />
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Every student</h2>
          <p className="text-sm text-gray-500">
            Time on the platform and work completed during {rangeLabel}.
          </p>
        </div>
        <SessionActivityTable summaries={summaries} />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Session by session
          </h2>
          <SessionLegend />
        </div>
        <SessionDetailList students={detailStudents} />
      </section>
    </div>
  )
}

// ── Mastery Reports tab (whole roster) ─────────────────────────────────────

async function MasteryTab({ userId }: { userId: string }) {
  const [byBenchmark, byCategory] = await Promise.all([
    getClassMasteryByBenchmark(userId),
    getClassMasteryByReportingCategory(userId),
  ])

  return (
    <div className="space-y-8">
      <p className="text-sm text-gray-500 print:hidden">
        Whole-roster mastery across all your classes.
      </p>

      {/* Mastery by Reporting Category */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Mastery by Reporting Category
        </h2>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 pr-4">Category</th>
              <th className="pb-2 pr-4 text-right">Mastery Rate</th>
              <th className="pb-2 pr-4 text-right">Mastered</th>
              <th className="pb-2 text-right">Attempts</th>
            </tr>
          </thead>
          <tbody>
            {byCategory.map((row) => (
              <tr key={row.reportingCategoryId} className="border-b last:border-0">
                <td className="py-2 pr-4 font-medium">{row.name}</td>
                <td className="py-2 pr-4 text-right">
                  {row.masteryRatePercent.toFixed(1)}%
                </td>
                <td className="py-2 pr-4 text-right">{row.masteredCount}</td>
                <td className="py-2 text-right">{row.totalAttempts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Mastery by Benchmark */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Mastery by Benchmark
        </h2>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 pr-4">Benchmark</th>
              <th className="pb-2 pr-4">Title</th>
              <th className="pb-2 pr-4 text-right">Mastery Rate</th>
              <th className="pb-2 text-right">Mastered / Total</th>
            </tr>
          </thead>
          <tbody>
            {byBenchmark.map((row) => (
              <tr key={row.benchmarkId} className="border-b last:border-0">
                <td className="py-2 pr-4 font-mono text-xs">{row.benchmarkCode}</td>
                <td className="py-2 pr-4">{row.title}</td>
                <td className="py-2 pr-4 text-right">
                  {row.masteryRatePercent.toFixed(1)}%
                </td>
                <td className="py-2 text-right">
                  {row.masteredCount} / {row.totalStudents}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
