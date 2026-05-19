'use client'

import { useState, useEffect } from 'react'
import { ConfidenceSelector } from './ConfidenceSelector'

interface Option {
  id: string
  optionText: string
  position: number
}

interface Question {
  questionId: string
  prompt: string
  itemType: string
  stimulusContent?: string | null
  options: Option[]
}

interface AssessmentMeta {
  assessmentId: string
  title: string
  assessmentType: string
  masteryThreshold: number
  questions: Question[]
}

interface AssessmentPlayerProps {
  assessmentId: string
}

const CONFIDENCE_REQUIRED = new Set(['MASTERY_CHALLENGE', 'REPUBLIC_CHALLENGE', 'FINAL_TRIAL'])

export function AssessmentPlayer({ assessmentId }: AssessmentPlayerProps) {
  const [meta, setMeta] = useState<AssessmentMeta | null>(null)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, { optionId: string; confidence: string | null }>>({})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<{ passed: boolean; score: number; feedback?: unknown[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/assessment/${assessmentId}`)
        if (!res.ok) throw new Error('Failed to load assessment')
        const data: AssessmentMeta = await res.json()
        setMeta(data)

        const startRes = await fetch(`/api/assessment/${assessmentId}/start`, { method: 'POST' })
        if (!startRes.ok) throw new Error('Failed to start attempt')
        const { attemptId: id } = await startRes.json()
        setAttemptId(id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [assessmentId])

  if (loading) return <div className="py-12 text-center text-gray-400">Loading assessment…</div>
  if (error) return <div className="py-12 text-center text-red-500">{error}</div>
  if (!meta || !attemptId) return null

  const needsConfidence = CONFIDENCE_REQUIRED.has(meta.assessmentType)
  const questions = meta.questions

  if (submitted && result) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className={`text-5xl ${result.passed ? '🏆' : '📚'}`}>{result.passed ? '🏆' : '📚'}</div>
        <h2 className={`text-2xl font-bold ${result.passed ? 'text-green-700' : 'text-amber-700'}`}>
          {result.passed ? 'Mission Complete!' : 'Keep Practicing!'}
        </h2>
        <p className="text-gray-600">Score: {Math.round(result.score * 100)}%</p>
        {result.passed ? (
          <p className="text-sm text-gray-500">Next mission unlocked. Head to the Mission Map!</p>
        ) : (
          <p className="text-sm text-gray-500">Remediation has been assigned to strengthen your skills.</p>
        )}
        <a href="/student/map" className="inline-block mt-4 rounded-lg bg-indigo-600 px-5 py-2 text-white font-medium hover:bg-indigo-700">
          Mission Map
        </a>
      </div>
    )
  }

  const currentQ = questions[currentIndex]
  const currentAnswer = answers[currentQ.questionId]
  const isLast = currentIndex === questions.length - 1
  const canAdvance = !!currentAnswer?.optionId && (!needsConfidence || !!currentAnswer?.confidence)

  async function handleSubmit() {
    if (!meta || !attemptId) return
    setLoading(true)
    try {
      const responses = Object.entries(answers).map(([questionId, { optionId, confidence }]) => ({
        questionId,
        selectedOptionId: optionId,
        confidenceRating: confidence,
      }))
      const res = await fetch(`/api/assessment/${assessmentId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, responses }),
      })
      const data = await res.json()
      setResult({
        passed: data.passed,
        score: data.score,
        feedback: data.feedback,
      })
      setSubmitted(true)
    } catch {
      setError('Submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">{meta.title}</h2>
        <span className="text-sm text-gray-400">
          {currentIndex + 1} / {questions.length}
        </span>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div
          className="bg-indigo-500 h-1.5 rounded-full transition-all"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        {currentQ.stimulusContent && (
          <blockquote className="border-l-4 border-indigo-300 pl-4 py-2 bg-indigo-50 rounded-r-lg text-sm text-gray-700 italic">
            {currentQ.stimulusContent}
          </blockquote>
        )}
        <p className="text-gray-800 font-medium leading-relaxed">{currentQ.prompt}</p>

        <div className="space-y-2" role="group" aria-label="Answer choices">
          {currentQ.options
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  setAnswers((prev) => ({
                    ...prev,
                    [currentQ.questionId]: { optionId: opt.id, confidence: prev[currentQ.questionId]?.confidence ?? null },
                  }))
                }
                className={`w-full text-left rounded-lg border-2 px-4 py-3 text-sm transition-colors ${
                  currentAnswer?.optionId === opt.id
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
                aria-pressed={currentAnswer?.optionId === opt.id}
              >
                {opt.optionText}
              </button>
            ))}
        </div>

        {needsConfidence && currentAnswer?.optionId && (
          <ConfidenceSelector
            value={currentAnswer?.confidence ?? null}
            onChange={(c) =>
              setAnswers((prev) => ({
                ...prev,
                [currentQ.questionId]: { optionId: prev[currentQ.questionId]?.optionId ?? '', confidence: c },
              }))
            }
          />
        )}
      </div>

      <div className="flex justify-end">
        {isLast ? (
          <button
            onClick={handleSubmit}
            disabled={!canAdvance || loading}
            className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Submit Assessment
          </button>
        ) : (
          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            disabled={!canAdvance}
            className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  )
}
