'use client'

/**
 * Teacher walkthrough: what students face at an assessment step (ADR 0015).
 *
 * Shows the assessment's questions with the correct option marked — behind
 * per-question disclosures with an expand-all toggle, so the walkthrough stays
 * fast to skim. Read-only: nothing here can start or submit an attempt.
 */

import { useState } from 'react'
import type { AssessmentPreview } from '@/lib/lesson-media'

const COMPLEXITY_LABELS: Record<string, string> = {
  LOW: 'Low complexity',
  MODERATE: 'Moderate complexity',
  HIGH: 'High complexity',
}

export function AssessmentPreviewCard({
  preview,
  studentExperience,
}: {
  preview: AssessmentPreview
  /** One sentence on what students do here ("Graded — 80% unlocks the next mission"). */
  studentExperience: string
}) {
  const [expandAll, setExpandAll] = useState(false)
  const letters = ['A', 'B', 'C', 'D', 'E']

  return (
    <div className="space-y-3 rounded-2xl border-2 border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-display text-base font-bold text-gray-900">{preview.title}</p>
          <p className="text-sm text-gray-600">{studentExperience}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-bold text-gray-700">
            {preview.questions.length} question{preview.questions.length === 1 ? '' : 's'}
          </span>
          {preview.questions.length > 0 && (
            <button
              type="button"
              onClick={() => setExpandAll((v) => !v)}
              className="rounded-md border border-indigo-300 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
            >
              {expandAll ? 'Collapse all' : 'Show all answers'}
            </button>
          )}
        </div>
      </div>

      {preview.questions.length === 0 ? (
        <p className="text-sm text-gray-600">No questions assigned yet.</p>
      ) : (
        <ol className="space-y-2">
          {preview.questions.map((q, qi) => (
            <li key={qi}>
              <details
                open={expandAll || undefined}
                className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5"
              >
                <summary className="cursor-pointer text-base leading-6 text-gray-900">
                  <span className="mr-2 font-display text-sm font-bold text-gray-500">
                    Q{qi + 1}
                  </span>
                  {q.prompt}
                  <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {COMPLEXITY_LABELS[q.cognitiveComplexity] ?? q.cognitiveComplexity}
                  </span>
                </summary>
                <ul className="mt-2 space-y-1.5 border-t border-gray-100 pt-2">
                  {q.options.map((opt, oi) => (
                    <li
                      key={oi}
                      className={`flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-sm leading-6 ${
                        opt.isCorrect ? 'bg-green-50 text-green-900' : 'text-gray-700'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded font-display text-xs font-bold ${
                          opt.isCorrect ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {opt.isCorrect ? '✓' : letters[oi] ?? '•'}
                      </span>
                      <span>
                        {opt.text}
                        {opt.feedback && (
                          <span className="mt-0.5 block text-xs italic text-gray-500">
                            {opt.feedback}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
