import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { getTeacherRoster } from '@/lib/teacher-roster'
import {
  getClassMasteryByBenchmark,
  getClassMasteryByReportingCategory,
} from '@/lib/class-analytics'
import { buildDailyClassReport } from '@/lib/daily-report'
import { EmptyState } from '@/components/teacher/shared/EmptyState'
import { StatCard } from '@/components/teacher/dashboard/StatCard'
import { ReportActions } from '@/components/teacher/reports/ReportActions'
import { ClassPicker } from '@/components/teacher/reports/ClassPicker'
import { DailyActionPlan } from '@/components/teacher/reports/DailyActionPlan'
import { DailyRosterTable } from '@/components/teacher/reports/DailyRosterTable'

type Tab = 'daily' | 'mastery'

interface ReportsPageProps {
  searchParams: { tab?: string; classId?: string }
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])
  const userId = session.user.userId
  const roster = await getTeacherRoster(userId)

  const hasStudents = roster.allStudentIds.length > 0
  const tab: Tab = searchParams.tab === 'mastery' ? 'mastery' : 'daily'

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
