/**
 * Teacher — Benchmarks list page.
 *
 * Every benchmark in the course, grouped by unit in curriculum (sequence)
 * order, with class mastery rates. Benchmarks nobody has attempted yet still
 * appear (previously they were silently omitted).
 * Server component.
 */

import { requireAuth } from '@/lib/auth'
import { getBenchmarksGroupedByUnit } from '@/lib/class-analytics'
import { getBenchmarkReadiness } from '@/lib/mastery'
import { EmptyState } from '@/components/teacher/shared/EmptyState'
import { ReadinessToggle } from '@/components/teacher/benchmark/ReadinessToggle'
import { ExplainerHover } from '@/components/ui/ExplainerHover'
import Link from 'next/link'

export default async function BenchmarksPage() {
  const session = await requireAuth(['TEACHER'])
  const [unitGroups, readiness] = await Promise.all([
    getBenchmarksGroupedByUnit(session.user.userId),
    getBenchmarkReadiness(),
  ])
  const readinessById = new Map(readiness.map((r) => [r.benchmarkId, r]))

  const hasAnyBenchmarks = unitGroups.some((group) => group.benchmarks.length > 0)

  if (!hasAnyBenchmarks) {
    return (
      <EmptyState
        title="No benchmarks yet"
        body="Benchmarks will appear here once a unit is marked active."
      />
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Benchmarks</h1>
        <p className="text-sm text-gray-500">
          Grouped by unit, in the order they&rsquo;re taught. Click a benchmark for detailed analytics.
        </p>
      </div>

      <nav aria-label="Jump to unit" className="flex flex-wrap gap-2">
        {unitGroups.map((group) => (
          <a
            key={group.unitId}
            href={`#unit-${group.unitId}`}
            className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
          >
            {group.unitTitle}
          </a>
        ))}
      </nav>

      {unitGroups.map((group) => {
        const atMastery = group.benchmarks.filter(
          (b) => b.hasData && b.masteryRatePercent >= 80
        ).length

        return (
          <section key={group.unitId} id={`unit-${group.unitId}`} className="scroll-mt-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{group.unitTitle}</h2>
                <p className="text-xs text-gray-400">{group.gameRegionName}</p>
              </div>
              <span className="shrink-0 text-xs text-gray-400">
                {atMastery}/{group.benchmarks.length} benchmarks at 80%+ class mastery
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    <th className="px-4 py-3">Benchmark</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3 text-right">Mastered</th>
                    <th className="px-4 py-3 text-right">
                      <ExplainerHover
                        theme="admin"
                        variant="underline"
                        title="Rate"
                        text="The percentage of your students who have reached mastery on this benchmark."
                      >
                        Rate
                      </ExplainerHover>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <ExplainerHover
                        theme="admin"
                        variant="underline"
                        title="Students"
                        text="Whether students can open this mission. A mission opens only when you switch it on AND it has an approved lesson plus an approved Mastery Challenge — so this can withhold a mission, but it can never put an empty one in front of a student. Withheld missions show as 'Coming Soon' on the Mission Map, never as a padlock."
                      >
                        Students
                      </ExplainerHover>
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {group.benchmarks.map((row) => (
                    <tr key={row.benchmarkId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">
                        {row.benchmarkCode}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.title}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                        {row.hasData ? `${row.masteredCount}/${row.totalStudents}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-block min-w-[3rem] rounded-full px-2 py-0.5 text-center text-xs font-semibold ${
                            !row.hasData
                              ? 'bg-gray-100 text-gray-500'
                              : row.masteryRatePercent >= 80
                              ? 'bg-green-100 text-green-700'
                              : row.masteryRatePercent >= 50
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {row.hasData ? `${row.masteryRatePercent}%` : 'Not started'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(() => {
                          const r = readinessById.get(row.benchmarkId)
                          // Absent only for a benchmark outside the active-unit
                          // set the toggle query covers — nothing to switch.
                          if (!r) return <span className="text-xs text-gray-400">—</span>
                          return (
                            <ReadinessToggle
                              benchmarkId={row.benchmarkId}
                              readyForStudents={r.readyForStudents}
                              hasContent={r.hasContent}
                            />
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/teacher/benchmarks/${row.benchmarkId}`}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          View &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
    </div>
  )
}
