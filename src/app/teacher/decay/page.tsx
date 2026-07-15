/**
 * Teacher — Decay Dashboard page.
 *
 * Shows class-level decay rates with spike alerts and a breakdown
 * of decaying students per benchmark.
 * Server component.
 */

import { requireAuth } from '@/lib/auth'
import { getTeacherRoster } from '@/lib/teacher-roster'
import { getClassDecayRates } from '@/lib/spaced-retrieval/decay'
import { ClassDecayTable } from '@/components/teacher/decay/ClassDecayTable'
import { SpikeAlerts } from '@/components/teacher/decay/SpikeAlerts'
import { ReprimeButton } from '@/components/teacher/benchmark/ReprimeButton'
import { EmptyState } from '@/components/teacher/shared/EmptyState'

export default async function DecayPage() {
  const session = await requireAuth(['TEACHER'])
  const roster = await getTeacherRoster(session.user.userId)
  const decayRates = await getClassDecayRates(roster.teacherId)

  const spikes = decayRates.filter((d) => d.spikeAlert)
  const classOptions = roster.classes.map((c) => ({ id: c.id, name: c.name }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Decay Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track which benchmarks students are forgetting. Decay = most recent review quality &lt; 3.
          Spike = ≥ 50% of class decaying.
        </p>
      </div>

      {/* Spike Alerts — shown prominently when present */}
      {spikes.length > 0 && <SpikeAlerts spikes={spikes} />}

      {/* Re-prime intervention for spiking benchmarks */}
      {spikes.length > 0 && classOptions.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">Re-prime a spiking benchmark</h2>
          <p className="mt-1 text-xs text-amber-800">
            Halves the review interval and brings the material back into the Daily Drill sooner
            for the selected class.
          </p>
          <ul className="mt-3 space-y-3">
            {spikes.map((s) => (
              <li key={s.benchmarkId} className="flex flex-col gap-1">
                <span className="font-mono text-xs font-semibold text-amber-900">
                  {s.benchmarkCode}{' '}
                  <span className="font-sans font-normal text-amber-700">
                    ({s.decayingStudents}/{s.totalStudents} decaying)
                  </span>
                </span>
                <ReprimeButton benchmarkId={s.benchmarkId} classes={classOptions} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Full decay table */}
      {decayRates.length === 0 ? (
        <EmptyState
          title="No decay data yet"
          body="Once students complete spaced reviews, decay rates will appear here."
        />
      ) : (
        <ClassDecayTable decayRates={decayRates} />
      )}
    </div>
  )
}
