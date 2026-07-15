/**
 * Teacher — EOC Readiness Dashboard (spec §22.1, §30.4).
 *
 * Overall + per-category readiness, the 90-day readiness trend, and dimension
 * breakdowns (reading-load, complexity, stimulus type) for the first class.
 */

import { requireAuth } from '@/lib/auth'
import { getTeacherRoster } from '@/lib/teacher-roster'
import { getEocReadinessTrend } from '@/lib/class-analytics'
import { computeClassReadiness, getDimensionBreakdownForClass } from '@/lib/eoc-analytics'
import { EocReadinessTrendChart } from '@/components/teacher/dashboard/EocReadinessTrendChart'
import { EmptyState } from '@/components/teacher/shared/EmptyState'

export default async function EocReadinessPage() {
  const session = await requireAuth(['TEACHER'])
  const userId = session.user.userId

  const roster = await getTeacherRoster(userId)
  const firstClass = roster.classes[0]

  if (!firstClass) {
    return (
      <div className="space-y-6">
        <Header />
        <EmptyState title="No classes yet" body="Create or sync a class to see EOC readiness." />
      </div>
    )
  }

  const [readiness, trend, breakdown] = await Promise.all([
    computeClassReadiness(firstClass.id),
    getEocReadinessTrend(userId),
    getDimensionBreakdownForClass(firstClass.id),
  ])

  return (
    <div className="space-y-6">
      <Header />

      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
        <p className="text-sm text-indigo-700">Class: {firstClass.name}</p>
        <p className="mt-1 text-3xl font-bold text-indigo-800">{Math.round(readiness.overallPercent)}%</p>
        <p className="text-xs text-indigo-600">
          Overall Republic Strength across {readiness.studentCount} student(s) — an internal
          preparation estimate, not a predicted EOC score.
        </p>
      </div>

      {readiness.byCategory.length > 0 && (
        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-800">Readiness by Reporting Category</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2 pr-4 font-medium">Category</th>
                <th className="py-2 pr-4 font-medium">Readiness</th>
                <th className="py-2 pr-4 font-medium">Mastered / Total</th>
              </tr>
            </thead>
            <tbody>
              {readiness.byCategory.map((c) => (
                <tr key={c.reportingCategoryId} className="border-b border-gray-100">
                  <td className="py-2 pr-4 text-gray-800">{c.name}</td>
                  <td className="py-2 pr-4 font-medium text-indigo-700">
                    {Math.round(c.readinessPercent)}%{' '}
                    <span className="text-xs font-normal text-gray-400">
                      ({Math.round(c.readinessLow)}–{Math.round(c.readinessHigh)}%)
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-gray-600">
                    {c.masteredCount} / {c.totalBenchmarks}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {trend.length === 0 ? (
        <EmptyState title="No trend data yet" body="The readiness trend builds as students complete work over time." />
      ) : (
        <EocReadinessTrendChart points={trend} />
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <DimensionCard title="By Reading Load" rows={breakdown.readingLoad.map((r) => ({ label: `Level ${r.key}`, rate: r.correctRate, n: r.sampleSize }))} />
        <DimensionCard title="By Complexity" rows={breakdown.complexity.map((r) => ({ label: r.key, rate: r.correctRate, n: r.sampleSize }))} />
        <DimensionCard title="By Stimulus Type" rows={breakdown.stimulusType.map((r) => ({ label: r.key, rate: r.correctRate, n: r.sampleSize }))} />
      </section>
    </div>
  )
}

function DimensionCard({
  title,
  rows,
}: {
  title: string
  rows: Array<{ label: string; rate: number; n: number }>
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-400">No data yet.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {rows.map((r) => (
            <li key={r.label} className="flex justify-between text-gray-600">
              <span>{r.label}</span>
              <span className="font-mono">
                {r.rate}% <span className="text-xs text-gray-400">(n={r.n})</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Header() {
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">EOC Readiness</h1>
      <p className="text-sm text-gray-500 mt-1">
        Republic Strength meter, readiness trend, and performance by dimension.
      </p>
    </div>
  )
}
