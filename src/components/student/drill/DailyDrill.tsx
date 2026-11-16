'use client'

/**
 * Daily Republic Drill. The device decides what is due (SM-2 state lives
 * here), asks the server for one question per due benchmark, and updates its
 * own schedule from each graded answer.
 */

import { useEffect, useRef, useState } from 'react'
import { useLocalProgress } from '@/lib/local-progress/useLocalProgress'
import { dueReviewCodes, setLastActivity } from '@/lib/local-progress/engine'
import { DrillCard, type DrillItem } from './DrillCard'
import { NextStepHandoff } from '@/components/student/NextStepHandoff'
import { Mascot } from '@/components/ui/Mascot'

export function DailyDrill() {
  const { progress, hydrated, update } = useLocalProgress()
  const [items, setItems] = useState<DrillItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  // Build the queue ONCE per visit. Answering changes what is due; the queue
  // must not reshuffle underneath the student.
  useEffect(() => {
    if (!hydrated || started.current) return
    started.current = true
    const due = dueReviewCodes(progress, new Date())
    if (due.length === 0) {
      setDone(true)
      setLoading(false)
      return
    }
    update((p) =>
      setLastActivity(
        p,
        { label: 'Daily Republic Drill', subLabel: 'Finish your review', href: '/student/daily-drill', icon: 'bolt' },
        new Date()
      )
    )
    fetch('/api/drill/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ benchmarkCodes: due, seenQuestionIds: progress.seenQuestionIds }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load failed'))))
      .then((data: { items: DrillItem[] }) => {
        setItems(data.items ?? [])
        if ((data.items ?? []).length === 0) setDone(true)
      })
      .catch(() => setError('The drill could not be loaded. Try again in a moment.'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  function handleComplete() {
    const next = currentIndex + 1
    if (next >= items.length) setDone(true)
    else setCurrentIndex(next)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center text-base text-gray-600">
        Loading drill queue…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-indigo-900">Daily Republic Drill</h1>
        {items.length > 0 && !done && (
          <span className="rounded-full bg-amber-100 px-3 py-1 font-display text-sm font-bold text-amber-800">
            {currentIndex + 1} / {items.length}
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-xl border-2 border-red-200 bg-red-50 px-3 py-2 text-base text-red-800">
          {error}
        </p>
      )}

      {items.length > 0 && !done && (
        <div
          className="h-2.5 w-full overflow-hidden rounded-full bg-amber-100"
          role="progressbar"
          aria-label="Drill progress"
          aria-valuenow={currentIndex + 1}
          aria-valuemin={1}
          aria-valuemax={items.length}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
          />
        </div>
      )}

      {done ? (
        <div className="rounded-3xl border-2 border-amber-200 bg-white px-4 py-10 text-center shadow-card animate-pop-in">
          <Mascot pose={items.length === 0 ? 'happy' : 'celebrating'} className="mx-auto h-24 w-24" />
          <p className="mt-2 font-display text-2xl font-bold text-gray-900">
            {items.length === 0 ? 'All caught up for today!' : 'Drill complete — great work!'}
          </p>
          <p className="mt-1 text-base text-gray-600">
            {items.length === 0
              ? 'Nothing is due for review right now. Master a mission and it will come back here for review.'
              : 'Your review schedule is updated — these will come back just before you forget them.'}
          </p>
          <NextStepHandoff secondary="both" />
        </div>
      ) : (
        !error &&
        items[currentIndex] && (
          // Keyed per question so answer/confidence/feedback state can't leak
          // from one drill item into the next.
          <DrillCard
            key={items[currentIndex].questionId}
            item={items[currentIndex]}
            onComplete={handleComplete}
          />
        )
      )}
    </div>
  )
}
