/**
 * Assessment Attempt Review — mastered-mission revisit.
 *
 * Replaces a live AssessmentPlayer for a student revisiting a mission they've
 * already mastered. Shows every past submitted attempt (across all rotating
 * forms of the assessment type) with, per question, the student's own answer
 * and whether it was correct — the correct answer itself is NEVER rendered,
 * so results can't be shared to help another student cheat.
 */

import { TrackIcon } from '@/components/ui/TrackIcon'
import type { AttemptReview } from '@/lib/assessment'

const CONFIDENCE_LABELS: Record<number, string> = {
  0: 'Not sure',
  1: 'Pretty sure',
  2: 'Very sure',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function AssessmentAttemptReview({
  attempts,
  emptyMessage = 'No submitted attempts on record for this step yet.',
}: {
  attempts: AttemptReview[]
  emptyMessage?: string
}) {
  if (attempts.length === 0) {
    return (
      <p className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-600">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {attempts.map((attempt) => (
        <div key={attempt.attemptNumber} className="space-y-3 rounded-2xl border-2 border-indigo-100 bg-white p-4 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-display text-sm font-bold text-gray-900">Attempt {attempt.attemptNumber}</p>
            <div className="flex items-center gap-2">
              {attempt.score !== null && (
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800">
                  Score {Math.round(attempt.score * 100)}%
                </span>
              )}
              {attempt.passed !== null && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    attempt.passed ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {attempt.passed ? 'Passed' : 'Not Passed'}
                </span>
              )}
              <span className="text-xs font-semibold text-gray-500">{formatDate(attempt.submittedAt)}</span>
            </div>
          </div>

          <ul className="space-y-2">
            {attempt.responses.map((r, i) => (
              <li
                key={r.questionId}
                className={`rounded-xl border-2 p-3 ${
                  r.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-white ${
                      r.isCorrect ? 'bg-green-600' : 'bg-red-600'
                    }`}
                    aria-hidden="true"
                  >
                    <TrackIcon name={r.isCorrect ? 'check' : 'target'} className="h-3.5 w-3.5" strokeWidth={2.6} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-500">Question {i + 1}</p>
                    <p className="text-base text-gray-900">{r.prompt}</p>
                    <p className="mt-1 text-sm text-gray-700">
                      Your answer: <span className="font-semibold">{r.selectedOptionText ?? '(no answer)'}</span>
                    </p>
                    <p
                      className={`mt-0.5 text-sm font-bold ${r.isCorrect ? 'text-green-700' : 'text-red-700'}`}
                    >
                      {r.isCorrect ? 'Correct' : 'Incorrect'}
                    </p>
                    {r.confidence !== null && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        You said: {CONFIDENCE_LABELS[r.confidence] ?? r.confidence}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
