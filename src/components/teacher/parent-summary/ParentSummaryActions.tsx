'use client'

import { useState } from 'react'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

interface Props {
  studentId: string
  fieldsIncluded: string[]
}

/**
 * Toolbar for the parent progress summary. Hidden when printing (`print:hidden`).
 * - "Save as PDF" triggers the browser print dialog (→ Save as PDF), matching the
 *   established pattern in teacher/reports. No PDF library dependency.
 * - "Mark as shared" records an audit-log entry via the share API (Audit §36.15.4).
 */
export function ParentSummaryActions({ studentId, fieldsIncluded }: Props) {
  const [state, setState] = useState<'idle' | 'sharing' | 'shared' | 'error'>('idle')

  async function markShared() {
    setState('sharing')
    try {
      const res = await fetch(
        `/api/teacher/students/${studentId}/parent-summary/share`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fieldsIncluded }),
        }
      )
      setState(res.ok ? 'shared' : 'error')
    } catch {
      setState('error')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 print:hidden">
      <button
        onClick={() => window.print()}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      >
        Save as PDF
      </button>
      <ExplainerHover
        theme="admin"
        variant="plain"
        title="Mark as shared"
        text="Just records a note in the audit log that you shared this summary with the family — it doesn't send anything or notify the parent automatically."
      >
        <button
          onClick={markShared}
          disabled={state === 'sharing' || state === 'shared'}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          {state === 'shared' ? 'Marked as shared ✓' : state === 'sharing' ? 'Recording…' : 'Mark as shared'}
        </button>
      </ExplainerHover>
      {state === 'error' && (
        <span role="alert" className="text-sm text-red-600">
          Could not record share — try again.
        </span>
      )}
      {state === 'shared' && (
        <span role="status" className="text-sm text-emerald-700">
          Logged. You can now print or hand off this summary.
        </span>
      )}
    </div>
  )
}
