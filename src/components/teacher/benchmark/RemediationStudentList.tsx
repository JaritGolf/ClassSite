/**
 * RemediationStudentList — table of students currently in remediation for a benchmark.
 */

import type { StudentRemediationRow } from '@/lib/benchmark-analytics'
import { EmptyState } from '@/components/teacher/shared/EmptyState'
import { AlertBadge } from '@/components/teacher/shared/AlertBadge'
import Link from 'next/link'
import type { RemediationStatus } from '@prisma/client'

interface Props {
  rows: StudentRemediationRow[]
}

const STATUS_TONE: Record<RemediationStatus, 'info' | 'warn' | 'critical'> = {
  ASSIGNED: 'warn',
  IN_PROGRESS: 'info',
  COMPLETED: 'info',
  SKIPPED: 'warn',
}

export function RemediationStudentList({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Remediation Roster
        </h3>
        <EmptyState
          title="No students in remediation"
          body="No students are currently in remediation for this benchmark."
        />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Remediation Roster
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
              <th className="pb-2 pr-4">Student</th>
              <th className="pb-2 pr-4">Type</th>
              <th className="pb-2 pr-4">Assigned</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row, i) => (
              <tr key={`${row.studentId}-${i}`} className="hover:bg-gray-50">
                <td className="py-2 pr-4">
                  <Link
                    href={`/teacher/students/${row.studentId}`}
                    className="font-medium text-gray-900 hover:text-indigo-600"
                  >
                    {row.displayName}
                  </Link>
                </td>
                <td className="py-2 pr-4 text-xs text-gray-600">
                  {row.remediationType.replace(/_/g, ' ')}
                </td>
                <td className="py-2 pr-4 text-xs text-gray-500">
                  {row.assignedAt.toLocaleDateString()}
                </td>
                <td className="py-2">
                  <AlertBadge tone={STATUS_TONE[row.status]}>
                    {row.status}
                  </AlertBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
