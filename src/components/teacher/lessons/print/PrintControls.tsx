'use client'

import Link from 'next/link'
import type { PrintDocKind } from '@/lib/lesson-print/packet'

/**
 * Toolbar for the printable lesson materials. Hidden when printing.
 *
 * Switching between the packet and the answer key is a LINK, not client state:
 * the two documents are rendered server-side from the same source, and the
 * student packet must not carry the answers in its markup at all. A client
 * toggle would ship both and hide one.
 *
 * Printing itself is `window.print()` — the same choice ADR 0008 made for the
 * parent summary. No PDF library, and the browser's own dialog already offers
 * Save as PDF, paper size, and margins.
 */
export function PrintControls({
  benchmarkCode,
  doc,
}: {
  benchmarkCode: string
  doc: PrintDocKind
}) {
  const base = `/teacher/lessons/${benchmarkCode}/print`

  return (
    <div className="flex flex-wrap items-center gap-3 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-lg border-b-4 border-indigo-800 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 active:translate-y-0.5 active:border-b-2"
      >
        Print / Save as PDF
      </button>

      <div
        className="flex overflow-hidden rounded-lg border-2 border-gray-300"
        role="group"
        aria-label="Which document to print"
      >
        <Link
          href={`${base}?doc=packet`}
          aria-current={doc === 'packet' ? 'page' : undefined}
          className={`px-3 py-2 text-sm font-medium ${
            doc === 'packet'
              ? 'bg-gray-800 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Student packet
        </Link>
        <Link
          href={`${base}?doc=answer-key`}
          aria-current={doc === 'answer-key' ? 'page' : undefined}
          className={`border-l-2 border-gray-300 px-3 py-2 text-sm font-medium ${
            doc === 'answer-key'
              ? 'bg-gray-800 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Answer key
        </Link>
      </div>

      <Link
        href={`/teacher/lessons/${benchmarkCode}/walkthrough`}
        className="text-sm text-indigo-600 hover:underline"
      >
        ▶ Walk it like a student
      </Link>
      <Link
        href={`/teacher/lessons/${benchmarkCode}`}
        className="text-sm text-indigo-600 hover:underline"
      >
        ← Back to editing
      </Link>
    </div>
  )
}
