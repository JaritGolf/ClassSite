/**
 * Teacher Student Profile page
 */

import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getStudentProfileForTeacher } from '@/lib/student-profile'
import { StudentProfileHeader } from '@/components/teacher/student/StudentProfileHeader'
import { CalibrationTrendChart } from '@/components/teacher/student/CalibrationTrendChart'
import { SpacedRetrievalStatus } from '@/components/teacher/student/SpacedRetrievalStatus'
import { RemediationHistoryTable } from '@/components/teacher/student/RemediationHistoryTable'
import { OverrideHistoryTable } from '@/components/teacher/student/OverrideHistoryTable'
import { AccommodationEditor } from '@/components/teacher/student/AccommodationEditor'
import { VoidAttemptButton } from '@/components/teacher/student/VoidAttemptButton'
import { OverrideControl } from '@/components/teacher/student/OverrideControl'
import { StrategyOverridePanel } from '@/components/teacher/student/StrategyOverridePanel'
import { EmptyState } from '@/components/teacher/shared/EmptyState'
import { ExplainerHover } from '@/components/ui/ExplainerHover'
import Link from 'next/link'

interface PageProps {
  params: { studentId: string }
}

export default async function StudentProfilePage({ params }: PageProps) {
  const session = await requireAuth(['TEACHER'])
  const profile = await getStudentProfileForTeacher(
    session.user.userId,
    params.studentId
  )

  // Full accommodation catalog so the teacher can grant any code, not just
  // ones already on record (spec Appendix G).
  const accommodationCatalog = await prisma.accommodation.findMany({
    orderBy: { code: 'asc' },
    select: { code: true, name: true },
  })

  // Full benchmark list for the override control (any benchmark can be a target;
  // UNLOCK creates a progress row where none exists).
  const benchmarkRows = await prisma.benchmark.findMany({
    orderBy: { sequenceOrder: 'asc' },
    select: { id: true, code: true, title: true },
  })
  const overrideBenchmarks = benchmarkRows.map((b) => ({
    benchmarkId: b.id,
    code: b.code,
    title: b.title,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/teacher/classes" className="hover:text-indigo-600">
          Classes
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-gray-600">{profile.student.displayName}</span>
        <a
          href={`/api/teacher/students/${params.studentId}/report/export`}
          className="ml-auto rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Download Report (CSV)
        </a>
        <Link
          href={`/teacher/students/${params.studentId}/parent-summary`}
          className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
        >
          Parent Summary
        </Link>
      </div>

      <StudentProfileHeader profile={profile} />

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
          <p className="text-xl font-bold text-indigo-700">{profile.mastery.mastered.length}</p>
          <ExplainerHover title="Mastered" text="Benchmarks this student has scored 80%+ on the Mastery Challenge." theme="admin">
            <p className="text-xs text-gray-400">Mastered</p>
          </ExplainerHover>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
          <p className="text-xl font-bold text-yellow-600">{profile.mastery.needsRemediation.length}</p>
          <ExplainerHover title="Needs Remediation" text="Benchmarks where a Mastery Challenge attempt came up short and a review activity is assigned." theme="admin">
            <p className="text-xs text-gray-400">Needs Remed.</p>
          </ExplainerHover>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
          <p className="text-xl font-bold text-gray-700">{profile.spacedRetrieval.itemsDueCount}</p>
          <ExplainerHover title="Due Today" text="Spaced-review items due in this student's Daily Drill today." theme="admin">
            <p className="text-xs text-gray-400">Due Today</p>
          </ExplainerHover>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
          <p className="text-xl font-bold text-red-600">{profile.decayFlags.length}</p>
          <ExplainerHover title="Decaying" text="Benchmarks where this student's recall is dropping faster than the spaced-review schedule expects." theme="admin">
            <p className="text-xs text-gray-400">Decaying</p>
          </ExplainerHover>
        </div>
      </div>

      {/* Calibration + Spaced Retrieval */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CalibrationTrendChart
          trend={profile.calibration.trend}
          overallGap={profile.calibration.overallGap}
        />
        <SpacedRetrievalStatus
          spacedRetrieval={profile.spacedRetrieval}
          decayFlags={profile.decayFlags}
        />
      </div>

      {/* Attempts */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <ExplainerHover
          title="Assessment Attempts"
          text="Every assessment this student has taken. A voided attempt stays here for the record but no longer counts toward mastery or analytics."
          theme="admin"
        >
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Assessment Attempts</h2>
        </ExplainerHover>
        {profile.attempts.length === 0 ? (
          <EmptyState title="No attempts yet" body="Attempts will appear here once the student starts assessments." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-2 text-left font-medium text-gray-400">Assessment</th>
                  <th className="pb-2 text-left font-medium text-gray-400">Benchmark</th>
                  <th className="pb-2 text-right font-medium text-gray-400">#</th>
                  <th className="pb-2 text-right font-medium text-gray-400">Score</th>
                  <th className="pb-2 text-left font-medium text-gray-400">Result</th>
                  <th className="pb-2 text-left font-medium text-gray-400">Submitted</th>
                  <th className="pb-2 text-right font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {profile.attempts.map((a) => (
                  <tr key={a.id} className={`border-b border-gray-50 ${a.voided ? 'opacity-50' : ''}`}>
                    <td className="py-2 pr-2 text-gray-700 truncate max-w-[12rem]">
                      {a.assessmentTitle}
                      {a.voided && (
                        <span className="ml-1 rounded bg-red-100 px-1 text-red-600 text-[9px] font-bold uppercase">
                          voided
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-2 font-mono text-indigo-600">{a.benchmarkCode}</td>
                    <td className="py-2 pr-2 text-right text-gray-500">{a.attemptNumber}</td>
                    <td className="py-2 pr-2 text-right font-medium text-gray-700">
                      {a.score != null ? `${Math.round(a.score * 100)}%` : '—'}
                    </td>
                    <td className="py-2 pr-2">
                      {a.passed == null ? (
                        <span className="text-gray-300">—</span>
                      ) : a.passed ? (
                        <span className="font-medium text-green-600">Passed</span>
                      ) : (
                        <span className="font-medium text-red-600">Failed</span>
                      )}
                    </td>
                    <td className="py-2 text-gray-400">
                      {a.submittedAt
                        ? new Date(a.submittedAt).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="py-2 text-right">
                      {a.voided ? (
                        <span className="text-[10px] text-gray-300">—</span>
                      ) : (
                        <VoidAttemptButton attemptId={a.id} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply a new override */}
      <OverrideControl studentId={params.studentId} benchmarks={overrideBenchmarks} />

      {/* Strategist track requirements */}
      <StrategyOverridePanel
        studentId={params.studentId}
        missions={profile.strategyTrack.missions}
      />

      {/* Remediation + Override history */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RemediationHistoryTable history={profile.remediationHistory} />
        <OverrideHistoryTable history={profile.overrideHistory} />
      </div>

      {/* Accommodations */}
      <AccommodationEditor
        studentId={params.studentId}
        accommodations={profile.accommodations}
        catalog={accommodationCatalog}
      />
    </div>
  )
}
