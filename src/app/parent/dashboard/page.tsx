/**
 * Parent Dashboard (Phase 18, spec §23 Phase 2).
 *
 * Lists the children this parent is VERIFIED-linked to. Gated by
 * FEATURE_PARENT_PORTAL; when off, shows a "not available" panel. Only verified
 * links appear — pending/rejected links and non-linked students surface nothing.
 */

import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { isParentPortalEnabled, getVerifiedLinkedStudents } from '@/lib/parent-portal'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

export default async function ParentDashboard() {
  const session = await requireAuth(['PARENT'])

  if (!isParentPortalEnabled()) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900">Family Portal</h1>
        <p className="mt-2 text-sm text-gray-600">
          The family portal isn't available yet. Please check back later or contact your
          student's school.
        </p>
      </div>
    )
  }

  const students = await getVerifiedLinkedStudents(session.user.userId)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Your Students</h1>
        <p className="mt-1 text-sm text-gray-600">
          View each child's Civics Quest progress.{' '}
          <ExplainerHover
            theme="admin"
            variant="underline"
            title="What's included"
            text="Progress summaries show mission status, overall readiness, and scores — never the actual test questions or answer keys."
          >
            Reports never include test questions or answer keys.
          </ExplainerHover>
        </p>
      </header>

      {students.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm font-medium text-gray-700">No students linked yet</p>
          <p className="mt-1 text-sm text-gray-600">
            Ask your child's school to link and verify your account.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {students.map((s) => (
            <li key={s.studentId}>
              <Link
                href={`/parent/students/${s.studentId}`}
                className="block rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
              >
                <p className="text-lg font-semibold text-gray-900">{s.displayName}</p>
                <p className="mt-1 text-sm capitalize text-gray-600">{s.relationship}</p>
                <p className="mt-3 text-sm font-medium text-indigo-700">View progress →</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
