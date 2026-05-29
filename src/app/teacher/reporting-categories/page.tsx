/**
 * Teacher — Reporting Category Dashboard (spec §22.1).
 *
 * EOC "Republic Pillar" view: mastery + readiness by reporting category for the
 * teacher's first class.
 */

import { requireAuth } from '@/lib/auth'
import { getTeacherRoster } from '@/lib/teacher-roster'
import { getClassMasteryByReportingCategory } from '@/lib/class-analytics'
import { computeClassReadiness } from '@/lib/eoc-analytics'
import { EmptyState } from '@/components/teacher/shared/EmptyState'

export default async function ReportingCategoriesPage() {
  const session = await requireAuth(['TEACHER'])
  const userId = session.user.userId

  const roster = await getTeacherRoster(userId)
  const firstClass = roster.classes[0]

  if (!firstClass) {
    return (
      <div className="space-y-6">
        <Header />
        <EmptyState title="No classes yet" body="Create or sync a class to see reporting category analytics." />
      </div>
    )
  }

  const [masteryRows, readiness] = await Promise.all([
    getClassMasteryByReportingCategory(userId),
    computeClassReadiness(firstClass.id),
  ])

  const masteryByRc = new Map(masteryRows.map((r) => [r.reportingCategoryId, r]))

  return (
    <div className="space-y-6">
      <Header />

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-500">
          Class: <span className="font-medium text-gray-800">{firstClass.name}</span> · Overall EOC
          readiness: <span className="font-semibold text-indigo-700">{readiness.overallPercent}%</span>
        </p>
      </div>

      {readiness.byCategory.length === 0 ? (
        <EmptyState title="No data yet" body="Reporting category data appears once students attempt benchmarks." />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2 pr-4 font-medium">Republic Pillar (Reporting Category)</th>
              <th className="py-2 pr-4 font-medium">EOC Weight</th>
              <th className="py-2 pr-4 font-medium">Mastery</th>
              <th className="py-2 pr-4 font-medium">Readiness</th>
            </tr>
          </thead>
          <tbody>
            {readiness.byCategory.map((c) => {
              const mastery = masteryByRc.get(c.reportingCategoryId)
              return (
                <tr key={c.reportingCategoryId} className="border-b border-gray-100">
                  <td className="py-2 pr-4 text-gray-800">{c.name}</td>
                  <td className="py-2 pr-4 text-gray-600">{Math.round(c.weight * 100)}%</td>
                  <td className="py-2 pr-4 text-gray-600">
                    {mastery ? `${mastery.masteryRatePercent}%` : '—'}
                  </td>
                  <td className="py-2 pr-4 font-medium text-indigo-700">
                    {c.readinessPercent}%{' '}
                    <span className="text-xs font-normal text-gray-400">
                      ({c.readinessLow}–{c.readinessHigh}%)
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

function Header() {
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">Reporting Categories</h1>
      <p className="text-sm text-gray-500 mt-1">
        EOC readiness and mastery by reporting category (Republic Pillar).
      </p>
    </div>
  )
}
