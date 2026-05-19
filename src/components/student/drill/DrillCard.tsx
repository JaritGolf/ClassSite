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

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-mono text-indigo-700">
          {item.benchmarkCode}
        </span>
        <span className="text-xs text-gray-400">Interval: {item.intervalDays}d</span>
      </div>

      <p className="text-gray-800 font-medium leading-relaxed">{item.prompt}</p>

      {!feedback && (
        <>
          <div className="space-y-2" role="group" aria-label="Answer choices">
            {item.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedOptionId(opt.id)}
                className={`w-full text-left rounded-lg border-2 px-4 py-3 text-sm transition-colors ${
                  selectedOptionId === opt.id
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
                aria-pressed={selectedOptionId === opt.id}
              >
                {opt.optionText}
              </button>
            ))}
          </div>

          {selectedOptionId && (
            <ConfidenceSelector value={confidence} onChange={setConfidence} />
          )}

          <button
            onClick={handleSubmit}
            disabled={!selectedOptionId || !confidence || submitting}
            className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Submit
          </button>
        </>
      )}

      {feedback && (
        <div className={`rounded-lg p-3 ${feedback.correct ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
          <p className="text-sm font-medium">{feedback.message}</p>
          <button
            onClick={onComplete}
            className="mt-2 text-xs underline hover:no-underline"
          >
            Next item →
          </button>
        </div>
      )}
    </div>
  )
}
