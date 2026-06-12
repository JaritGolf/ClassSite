/**
 * Parent Progress Summary — print-optimized teacher view (Phase 14, §36.15).
 *
 * Server-rendered. Composes the allowlist parent VM (getParentSummary) and renders
 * a clean, parent-friendly report. The toolbar is hidden when printing; the body
 * uses `print:` utilities so "Save as PDF" produces a tidy one-page-ish document.
 *
 * Only parent-appropriate fields appear here — no calibration, decay, overrides,
 * accommodations, or item-level data (those live on the teacher profile page).
 */

import { requireAuth } from '@/lib/auth'
import { getParentSummary, PARENT_SUMMARY_FIELDS } from '@/lib/parent-summary'
import { ParentSummaryActions } from '@/components/teacher/parent-summary/ParentSummaryActions'
import { EmptyState } from '@/components/teacher/shared/EmptyState'
import Link from 'next/link'

interface PageProps {
  params: { studentId: string }
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default async function ParentSummaryPage({ params }: PageProps) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])
  const summary = await getParentSummary(session.user.userId, params.studentId)

  return (
    <div className="mx-auto max-w-3xl space-y-8 print:max-w-none print:space-y-6 print:p-0">
      {/* Breadcrumb + toolbar — screen only */}
      <div className="space-y-4 print:hidden">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/teacher/classes" className="hover:text-indigo-600">
            Classes
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            href={`/teacher/students/${params.studentId}`}
            className="hover:text-indigo-600"
          >
            {summary.student.displayName}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-gray-600">Parent Summary</span>
        </div>
        <ParentSummaryActions
          studentId={params.studentId}
          fieldsIncluded={[...PARENT_SUMMARY_FIELDS]}
        />
      </div>

      {/* Report header */}
      <header className="border-b border-gray-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
          Civics Quest · Progress Summary
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          {summary.student.displayName}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Grade {summary.student.gradeLevel} · Generated {formatDate(summary.generatedAt)}
        </p>
      </header>

      {/* Current mission */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Current Mission
        </h2>
        {summary.currentMission ? (
          <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
            <p className="font-semibold text-gray-900">
              {summary.currentMission.title}
            </p>
            <p className="mt-1 text-sm text-indigo-700">
              {summary.currentMission.statusLabel}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">
            Ready to begin the next mission.
          </p>
        )}
      </section>

      {/* EOC readiness */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Civics Readiness
        </h2>
        <div className="mt-2 rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-600">
              {summary.eocReadiness.overallPercent}%
            </span>
            <span className="text-sm text-gray-500">overall readiness</span>
          </div>
          {summary.eocReadiness.byCategory.length > 0 && (
            <ul className="mt-3 space-y-2">
              {summary.eocReadiness.byCategory.map((c) => (
                <li key={c.name} className="text-sm">
                  <div className="flex justify-between text-gray-700">
                    <span>{c.name}</span>
                    <span className="font-medium">{c.readinessPercent}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 print:bg-emerald-600"
                      style={{ width: `${Math.min(100, c.readinessPercent)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Mastery: mastered + needs review */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-700">
            Missions Mastered{' '}
            <span className="text-gray-400">({summary.mastery.mastered.length})</span>
          </h2>
          {summary.mastery.mastered.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">None mastered yet — that's okay!</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-gray-700">
              {summary.mastery.mastered.map((b) => (
                <li key={b.benchmarkCode} className="flex gap-2">
                  <span aria-hidden="true" className="text-emerald-500">✓</span>
                  <span>{b.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-700">
            Needs Review{' '}
            <span className="text-gray-400">({summary.mastery.needsReview.length})</span>
          </h2>
          {summary.mastery.needsReview.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">Nothing flagged for review.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-gray-700">
              {summary.mastery.needsReview.map((b) => (
                <li key={b.benchmarkCode} className="flex gap-2">
                  <span aria-hidden="true" className="text-amber-500">○</span>
                  <span>{b.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Remediation status */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Review Activities
        </h2>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-xl font-bold text-gray-700">{summary.remediation.assignedCount}</p>
            <p className="text-xs text-gray-400">Assigned</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-xl font-bold text-indigo-700">{summary.remediation.inProgressCount}</p>
            <p className="text-xs text-gray-400">In progress</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-xl font-bold text-emerald-600">{summary.remediation.completedCount}</p>
            <p className="text-xs text-gray-400">Completed</p>
          </div>
        </div>
      </section>

      {/* Recent assessments — score + pass/fail only */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Recent Assessments
        </h2>
        {summary.recentAssessments.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No assessments completed yet.</p>
        ) : (
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-400">
                <th className="pb-2 font-medium">Assessment</th>
                <th className="pb-2 text-right font-medium">Score</th>
                <th className="pb-2 text-right font-medium">Result</th>
                <th className="pb-2 text-right font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {summary.recentAssessments.map((a, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 pr-2 text-gray-700">{a.title}</td>
                  <td className="py-2 text-right font-medium text-gray-900">{a.scorePercent}%</td>
                  <td className="py-2 text-right">
                    <span
                      className={
                        a.passed
                          ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700'
                          : 'rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600'
                      }
                    >
                      {a.passed ? 'Passed' : 'Keep practicing'}
                    </span>
                  </td>
                  <td className="py-2 text-right text-gray-500">{formatDate(a.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Suggested at-home review */}
      {summary.suggestedReview.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Suggested At-Home Review
          </h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700">
            {summary.suggestedReview.map((topic, i) => (
              <li key={i}>{topic}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Positive progress indicators */}
      {summary.positiveIndicators.length > 0 && (
        <section className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
          <h2 className="text-sm font-semibold text-emerald-800">Bright Spots</h2>
          <ul className="mt-2 space-y-1 text-sm text-emerald-900">
            {summary.positiveIndicators.map((p, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden="true">★</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="border-t border-gray-200 pt-4 text-xs text-gray-400">
        This summary reflects your student's progress in Civics Quest. It does not
        include test questions or answer keys. Questions? Contact your student's teacher.
      </footer>

      {summary.mastery.totalBenchmarks === 0 && (
        <EmptyState
          title="No progress recorded yet"
          body="Once this student begins missions, their summary will fill in here."
        />
      )}
    </div>
  )
}
