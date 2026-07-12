'use client'

import { useState } from 'react'
import { ConfidenceSelector } from '@/components/student/assessment/ConfidenceSelector'

interface DrillOption {
  id: string
  optionText: string
}

interface DrillItem {
  benchmarkId: string
  benchmarkCode: string
  questionId: string
  prompt: string
  itemType: string
  options: DrillOption[]
  dueAt: Date | string
  repetitionCount: number
  intervalDays: number
}

interface DrillCardProps {
  item: DrillItem
  onComplete: () => void
}

export function DrillCard({ item, onComplete }: DrillCardProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!selectedOptionId || !confidence) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/drill/${item.benchmarkId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: item.questionId,
          selectedOptionId,
          confidenceRating: confidence,
        }),
      })
      const data = await res.json()
      setFeedback({
        correct: data.correct,
        message: data.correct ? 'Correct! Well done.' : 'Not quite — keep reviewing this one.',
      })
    } catch {
      setFeedback({ correct: false, message: 'Submission failed. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const letters = ['A', 'B', 'C', 'D', 'E', 'F']

  return (
    <div className="space-y-4 rounded-2xl border-2 border-amber-200 bg-white p-5 shadow-card">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-mono text-xs font-semibold text-amber-800">
          {item.benchmarkCode}
        </span>
        <span className="text-sm text-gray-500">Interval: {item.intervalDays}d</span>
      </div>

      <p className="text-base font-bold leading-7 text-gray-900">{item.prompt}</p>

      {!feedback && (
        <>
          <div className="space-y-2.5" role="group" aria-label="Answer choices">
            {item.options.map((opt, i) => {
              const isSelected = selectedOptionId === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedOptionId(opt.id)}
                  className={`flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-3 text-left text-base leading-snug transition-colors ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-950'
                      : 'border-gray-200 bg-white text-gray-800 hover:border-indigo-300 hover:bg-indigo-50/50'
                  }`}
                  aria-pressed={isSelected}
                >
                  <span
                    className={`mt-px flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {letters[i] ?? '•'}
                  </span>
                  <span className="pt-0.5">{opt.optionText}</span>
                </button>
              )
            })}
          </div>

          {selectedOptionId && (
            <ConfidenceSelector value={confidence} onChange={setConfidence} />
          )}

          <button
            onClick={handleSubmit}
            disabled={!selectedOptionId || !confidence || submitting}
            className="w-full rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 py-2.5 font-display text-base font-bold text-white transition-colors hover:bg-indigo-500 active:translate-y-[3px] active:border-b-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0 disabled:active:border-b-4"
          >
            Submit
          </button>
        </>
      )}

      {feedback && (
        <div
          className={`rounded-2xl border-2 p-4 animate-pop-in ${
            feedback.correct
              ? 'border-green-200 bg-green-50 text-green-900'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          <p className="text-base font-bold">
            {feedback.correct ? '✓ ' : ''}
            {feedback.message}
          </p>
          <button
            onClick={onComplete}
            className="mt-3 rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-4 py-2 font-display text-sm font-bold text-white transition-colors hover:bg-indigo-500 active:translate-y-[3px] active:border-b-0"
          >
            Next item →
          </button>
        </div>
      )}
    </div>
  )
}
