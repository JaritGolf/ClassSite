/**
 * Parent Progress Summary — print-optimized teacher view (Phase 14, §36.15).
 *
 * Server-rendered. Composes the allowlist parent VM (getParentSummary) and renders
 * it via the shared ParentSummaryView. The toolbar is hidden when printing; the
 * body uses `print:` utilities so "Save as PDF" produces a tidy document.
 *
 * Only parent-appropriate fields appear here — no calibration, decay, overrides,
 * accommodations, or item-level data (those live on the teacher profile page).
 */

import { requireAuth } from '@/lib/auth'
import { getParentSummary, PARENT_SUMMARY_FIELDS } from '@/lib/parent-summary'
import { ParentSummaryActions } from '@/components/teacher/parent-summary/ParentSummaryActions'
import { ParentSummaryView } from '@/components/parent-summary/ParentSummaryView'
import Link from 'next/link'

interface PageProps {
  params: { studentId: string }
}

export default async function ParentSummaryPage({ params }: PageProps) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])
  const summary = await getParentSummary(session.user.userId, params.studentId)

  return (
    <div className="mx-auto max-w-3xl space-y-8 print:max-w-none print:space-y-6 print:p-0">
      {/* Breadcrumb + toolbar — screen only */}
      <div className="space-y-4 print:hidden">
        <div className="flex items-center gap-2 text-sm text-gray-600">
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

      <ParentSummaryView summary={summary} />
    </div>
  )
}
