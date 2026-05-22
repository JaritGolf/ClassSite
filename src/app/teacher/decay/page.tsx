/**
 * Teacher — Decay Dashboard page.
 *
 * Shows class-level decay rates with spike alerts and a breakdown
 * of decaying students per benchmark.
 * Server component.
 */

import { requireAuth } from '@/lib/auth'
import { resolveTeacherId } from '@/lib/teacher-roster'
import { getClassDecayRates } from '@/lib/spaced-retrieval/decay'
import { ClassDecayTable } from '@/components/teacher/decay/ClassDecayTable'
import { SpikeAlerts } from '@/components/teacher/decay/SpikeAlerts'
import { EmptyState } from '@/components/teacher/shared/EmptyState'

export default async function DecayPage() {
  const session = await requireAuth(['TEACHER'])
  const teacherId = await resolveTeacherId(session.user.userId)
  const decayRates = await getClassDecayRates(teacherId)

  const spikes = decayRates.filter((d) => d.spikeAlert)

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
