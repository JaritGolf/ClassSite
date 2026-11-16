/**
 * Teacher — Benchmarks list page.
 *
 * Every benchmark in the course, grouped by unit in curriculum order, with the
 * switch that opens a mission to students. Server component.
 */

import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getBenchmarkReadiness } from '@/lib/mastery'
import { EmptyState } from '@/components/teacher/shared/EmptyState'
import { ReadinessToggle } from '@/components/teacher/benchmark/ReadinessToggle'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

export default async function BenchmarksPage() {
  await requireAuth(['TEACHER'])
  const [units, readiness] = await Promise.all([
    prisma.unit.findMany({
      where: { active: true },
      orderBy: { sequenceOrder: 'asc' },
      select: {
        id: true,
        title: true,
        gameRegionName: true,
        benchmarks: {
          orderBy: { sequenceOrder: 'asc' },
          select: { id: true, code: true, title: true },
        },
      },
    }),
    getBenchmarkReadiness(),
  ])
  const readinessById = new Map(readiness.map((r) => [r.benchmarkId, r]))

  if (!units.some((u) => u.benchmarks.length > 0)) {
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
          Grouped by unit, in the order they&rsquo;re taught. Click a benchmark to read its
          standard.
        </p>
      </div>

      <nav aria-label="Jump to unit" className="flex flex-wrap gap-2">
        {units.map((unit) => (
          <a
            key={unit.id}
            href={`#unit-${unit.id}`}
            className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
          >
            {unit.title}
          </a>
        ))}
      </nav>

      {units.map((unit) => (
        <section key={unit.id} id={`unit-${unit.id}`} className="scroll-mt-4 space-y-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{unit.title}</h2>
            <p className="text-xs text-gray-500">{unit.gameRegionName}</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Benchmark</th>
                  <th className="px-4 py-3">Title</th>
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
                {unit.benchmarks.map((b) => {
                  const r = readinessById.get(b.id)
                  return (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{b.code}</td>
                      <td className="px-4 py-3 text-gray-700">{b.title}</td>
                      <td className="px-4 py-3 text-right">
                        {r ? (
                          <ReadinessToggle
                            benchmarkId={b.id}
                            readyForStudents={r.readyForStudents}
                            hasContent={r.hasContent}
                          />
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/teacher/benchmarks/${b.id}`}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          View &rarr;
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  )
}
