'use client'

/**
 * Plays one Republic Challenge session.
 *
 * The device asks the server for a question set (sending, for the review
 * modes, which benchmarks are due and which questions it remembers missing),
 * plays it in the shared assessment player, and submits the answers together
 * with the signed token the server issued for that set.
 */

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AssessmentPlayer, type AssessmentSource } from '@/components/student/assessment/AssessmentPlayer'
import { useLocalProgress } from '@/lib/local-progress/useLocalProgress'
import { dueReviewCodes, setLastActivity } from '@/lib/local-progress/engine'
import { getProgress, updateProgress } from '@/lib/local-progress/store'

interface Props {
  mode: string
  reportingCategoryId: string | null
  stimulusType: string | null
}

export function RepublicChallengePlayer({ mode, reportingCategoryId, stimulusType }: Props) {
  const { progress, hydrated } = useLocalProgress()
  const session = useRef<{ token: string; questionIds: string[] } | null>(null)
  const [started, setStarted] = useState(false)

  const isFinalTrial = mode === 'FINAL_REPUBLIC_TRIAL'

  const source = useMemo<AssessmentSource>(
    () => ({
      async load() {
        const current = getProgress()
        const res = await fetch('/api/republic-challenge/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode,
            ...(reportingCategoryId ? { reportingCategoryId } : {}),
            ...(stimulusType ? { stimulusType } : {}),
            dueBenchmarkCodes: mode === 'QUICK_REVIEW' ? dueReviewCodes(current, new Date()) : [],
            missedQuestionIds:
              mode === 'QUICK_REVIEW' || mode === 'MISTAKE_REPLAY' ? current.missedQuestionIds : [],
          }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok || !data) throw new Error(data?.error ?? 'This session could not be started.')
        session.current = {
          token: data.sessionToken,
          questionIds: data.questions.map((q: { questionId: string }) => q.questionId),
        }
        updateProgress((p) =>
          setLastActivity(
            p,
            { label: data.title, subLabel: 'Republic Challenge', href: '/student/republic-challenge', icon: 'shield' },
            new Date()
          )
        )
        return {
          assessmentId: `rc:${mode}`,
          title: data.title,
          assessmentType: data.assessmentType,
          masteryThreshold: data.masteryThreshold,
          questions: data.questions,
        }
      },
      async submit(answers) {
        if (!session.current) throw new Error('This session has expired.')
        const res = await fetch('/api/republic-challenge/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode,
            sessionToken: session.current.token,
            questionIds: session.current.questionIds,
            responses: Object.entries(answers).map(([questionId, a]) => ({
              questionId,
              selectedOptionId: a.optionId,
              ...(a.confidence !== null ? { confidence: a.confidence } : {}),
            })),
          }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok || !data) throw new Error(data?.error ?? 'Submission failed.')
        if (mode === 'FINAL_REPUBLIC_TRIAL') {
          updateProgress((p) => ({ ...p, finalTrialTakenAt: new Date().toISOString() }))
        }
        return {
          assessmentType: data.assessmentType,
          benchmarkCode: null,
          score: data.score,
          passed: data.passed,
          totalQuestions: data.totalQuestions,
          correctCount: data.correctCount,
          results: data.results.map((r: { questionId: string; isCorrect: boolean }) => ({
            questionId: r.questionId,
            isCorrect: r.isCorrect,
            feedback: null,
            correctOptionText: null,
          })),
          calibration: data.calibration,
          reviewTopics: null,
          readinessToken: null,
          remediation: [],
          completionCode: null,
        }
      },
    }),
    [mode, reportingCategoryId, stimulusType]
  )

  if (!hydrated) {
    return <p className="py-12 text-center text-base text-gray-600">Loading…</p>
  }

  // The Final Republic Trial is meant to be taken once. The server cannot know
  // whether this device has taken it, so the device holds that line itself.
  if (isFinalTrial && progress.finalTrialTakenAt && !started) {
    return (
      <div className="space-y-4 rounded-2xl border-2 border-indigo-100 bg-white p-6 text-center shadow-card">
        <h1 className="font-display text-2xl font-bold text-gray-900">Final Republic Trial</h1>
        <p className="text-base text-gray-700">
          You have already taken the Final Republic Trial on this device. Use Mixed Mission or the
          Endurance Trial to keep practicing.
        </p>
        <Link
          href="/student/republic-challenge"
          className="inline-block rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-6 py-2.5 font-display text-base font-bold text-white hover:bg-indigo-500"
        >
          Back to Republic Challenge
        </Link>
      </div>
    )
  }

  if (isFinalTrial && !started) {
    return (
      <div className="space-y-4 rounded-2xl border-2 border-indigo-100 bg-white p-6 text-center shadow-card">
        <h1 className="font-display text-2xl font-bold text-gray-900">Final Republic Trial</h1>
        <p className="text-base text-gray-700">
          This is a full-length practice exam, and it is meant to be taken once. Start only when
          you have time to finish it.
        </p>
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="rounded-2xl border-b-4 border-amber-600 bg-amber-400 px-7 py-3 font-display text-base font-bold text-amber-950 hover:bg-amber-300"
        >
          Begin the Final Republic Trial →
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border-2 border-indigo-100 bg-white p-5 shadow-card">
      <AssessmentPlayer assessmentId={`rc:${mode}`} source={source} />
    </div>
  )
}
