/**
 * Parent — single student progress view (Phase 18).
 *
 * Renders the shared allowlist ParentSummaryView for one VERIFIED-linked
 * student. Authorization is enforced by getParentSummaryForParent; any access
 * error (portal off / not linked / not verified) → 404 so the parent cannot
 * probe for other students.
 */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getParentSummaryForParent, ParentAccessError } from '@/lib/parent-portal'
import { ParentSummaryView } from '@/components/parent-summary/ParentSummaryView'

interface PageProps {
  params: { studentId: string }
}

export default async function ParentStudentPage({ params }: PageProps) {
  const session = await requireAuth(['PARENT'])

  let summary
  try {
    summary = await getParentSummaryForParent(session.user.userId, params.studentId)
  } catch (e) {
    if (e instanceof ParentAccessError) notFound()
    throw e
  }

  return (
    <div className="space-y-8">
      <Link href="/parent/dashboard" className="text-sm text-indigo-700 hover:text-indigo-900">
        ← All students
      </Link>
      <ParentSummaryView summary={summary} />
    </div>
  )
}
