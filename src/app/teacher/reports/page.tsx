import { requireAuth } from '@/lib/auth'
import { getTeacherRoster } from '@/lib/teacher-roster'
import { getClassMasteryByBenchmark, getClassMasteryByReportingCategory } from '@/lib/class-analytics'
import { EmptyState } from '@/components/teacher/shared/EmptyState'

export default async function ReportsPage() {
  const session = await requireAuth(['TEACHER', 'ADMIN'])
  const roster = await getTeacherRoster(session.user.userId)
  const byBenchmark = await getClassMasteryByBenchmark(session.user.userId)
  const byCategory = await getClassMasteryByReportingCategory(session.user.userId)

  const hasData = roster.allStudentIds.length > 0

  return (
    <div className="space-y-8 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <div className="flex gap-3">
          <button
            disabled
            title="Coming in Phase 17"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
          >
            Export PDF (Phase 17)
          </button>
          <button
            disabled
            title="Coming in Phase 17"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
          >
            Export CSV (Phase 17)
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 print:hidden"
          >
            Print
          </button>
        </div>
      </div>

      {!hasData ? (
        <EmptyState title="No students enrolled" body="Enroll students in your classes to generate reports." />
      ) : (
        <>
          {/* Mastery by Reporting Category */}
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Mastery by Reporting Category</h2>
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
                    <td className="py-2 pr-4 text-right">{row.masteryRatePercent.toFixed(1)}%</td>
                    <td className="py-2 pr-4 text-right">{row.masteredCount}</td>
                    <td className="py-2 text-right">{row.totalAttempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Mastery by Benchmark */}
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Mastery by Benchmark</h2>
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
                    <td className="py-2 pr-4 text-right">{row.masteryRatePercent.toFixed(1)}%</td>
                    <td className="py-2 text-right">{row.masteredCount} / {row.totalStudents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  )
}
