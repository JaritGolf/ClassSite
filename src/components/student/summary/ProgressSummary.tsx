'use client'

/**
 * Printable progress summary — generated on the device, from the device.
 *
 * This replaces the parent portal and the teacher's per-student report. The
 * site cannot produce a report about a student because it holds nothing about
 * one; the student prints their own. It has no name on it. A student who
 * wants their name on the page writes it on the paper.
 */

import { useLocalProgress } from '@/lib/local-progress/useLocalProgress'
import { dueReviewCodes, missionAvailability } from '@/lib/local-progress/engine'
import { useStudentShell } from '@/components/student/shell/StudentShell'

const STATE_TEXT: Record<string, string> = {
  MASTERED: 'Mastered',
  EXPOSURE_COMPLETE: 'Moved on after extra practice',
  IN_PROGRESS: 'In progress',
  READY_FOR_MASTERY: 'Ready for the Mastery Challenge',
  NEEDS_REMEDIATION: 'Reviewing before another try',
  REMEDIATION_COMPLETE: 'Ready for a second try',
  AVAILABLE: 'Not started',
  NOT_STARTED: 'Not started',
  LOCKED: 'Not open yet',
  COMING_SOON: 'Coming soon',
}

function day(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ProgressSummary() {
  const shell = useStudentShell()
  const { progress, hydrated } = useLocalProgress()

  if (!hydrated) {
    return <p className="py-16 text-center text-base text-gray-600">Building your summary…</p>
  }

  const availability = missionAvailability(shell.missions, progress)
  const mastered = shell.missions.filter((m) => progress.missions[m.code]?.status === 'MASTERED')
  const badges = Object.entries(progress.badges).sort((a, b) => a[1].localeCompare(b[1]))

  return (
    <div className="mx-auto max-w-3xl space-y-6 bg-white px-6 py-8 print:px-0 print:py-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">My Civics Class — progress summary</h1>
          <p className="text-sm text-gray-700">Printed {day(new Date().toISOString())} from this device.</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-4 py-2 font-display text-sm font-bold text-white hover:bg-indigo-500 print:hidden"
        >
          Print
        </button>
      </div>

      <p className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800">
        Name (write it in after printing): ____________________________
      </p>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Missions mastered', `${mastered.length} of ${shell.missions.length}`],
          ['Current streak', `${progress.streak.currentLength} day${progress.streak.currentLength === 1 ? '' : 's'}`],
          ['Reviews due', String(dueReviewCodes(progress, new Date()).length)],
          ['Badges earned', String(badges.length)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-gray-300 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">{label}</dt>
            <dd className="font-display text-lg font-bold text-gray-900">{value}</dd>
          </div>
        ))}
      </dl>

      {shell.units.map((unit) => (
        <section key={unit.id}>
          <h2 className="font-display text-base font-bold text-gray-900">
            Unit {unit.sequenceOrder}: {unit.title}
          </h2>
          <table className="mt-2 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-gray-300 text-left text-xs uppercase tracking-wide text-gray-600">
                <th scope="col" className="py-1.5 pr-2">Mission</th>
                <th scope="col" className="py-1.5 pr-2">Status</th>
                <th scope="col" className="py-1.5 pr-2">Score</th>
                <th scope="col" className="py-1.5 pr-2">Date</th>
                <th scope="col" className="py-1.5">Completion code</th>
              </tr>
            </thead>
            <tbody>
              {unit.benchmarks.map((b) => {
                const record = progress.missions[b.code]
                const state = availability.get(b.code)?.state ?? 'COMING_SOON'
                return (
                  <tr key={b.code} className="border-b border-gray-200 align-top">
                    <th scope="row" className="py-1.5 pr-2 text-left font-normal text-gray-900">
                      <span className="font-mono text-xs text-gray-600">{b.code}</span> {b.title}
                    </th>
                    <td className="py-1.5 pr-2 text-gray-900">{STATE_TEXT[state] ?? state}</td>
                    <td className="py-1.5 pr-2 text-gray-900">
                      {record?.masteryScore != null ? `${Math.round(record.masteryScore * 100)}%` : '—'}
                    </td>
                    <td className="py-1.5 pr-2 text-gray-900">{day(record?.masteredAt)}</td>
                    <td className="py-1.5 font-mono text-xs text-gray-900">{record?.completionCode ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      ))}

      {badges.length > 0 && (
        <section>
          <h2 className="font-display text-base font-bold text-gray-900">Badges</h2>
          <ul className="mt-1 list-disc pl-5 text-sm text-gray-900">
            {badges.map(([name, at]) => (
              <li key={name}>
                {name} — {day(at)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-gray-600">
        This summary was made by the browser on this device. The My Civics Class website does not
        keep a copy and does not store student records.
      </p>
    </div>
  )
}
