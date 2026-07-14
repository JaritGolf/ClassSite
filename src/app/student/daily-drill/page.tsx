'use client'

import { useState, useEffect } from 'react'
import { DrillCard } from '@/components/student/drill/DrillCard'
import { Mascot } from '@/components/ui/Mascot'

interface DrillItem {
  benchmarkId: string
  benchmarkCode: string
  questionId: string
  prompt: string
  itemType: string
  options: { id: string; optionText: string }[]
  dueAt: string
  repetitionCount: number
  intervalDays: number
}

export default function DailyDrillPage() {
  const [items, setItems] = useState<DrillItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetch('/api/drill')
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items ?? [])
        if ((data.items ?? []).length === 0) setDone(true)
      })
      .finally(() => setLoading(false))
  }, [])

  function handleComplete() {
    const next = currentIndex + 1
    if (next >= items.length) {
      setDone(true)
    } else {
      setCurrentIndex(next)
    }
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
        <div className="space-y-3 rounded-3xl border-2 border-amber-200 bg-white py-12 text-center shadow-card animate-pop-in">
          <Mascot pose={items.length === 0 ? 'happy' : 'celebrating'} className="mx-auto h-24 w-24" />
          <p className="font-display text-2xl font-bold text-gray-900">
            {items.length === 0 ? 'All caught up for today!' : 'Drill complete — great work!'}
          </p>
          <p className="text-base text-gray-600">
            {items.length === 0
              ? 'No items are due right now. Come back tomorrow!'
              : 'Your spaced review state has been updated. See you tomorrow!'}
          </p>
          <a
            href="/student/dashboard"
            className="mt-4 inline-block rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-5 py-2.5 font-display text-base font-bold text-white transition-colors hover:bg-indigo-500 active:translate-y-[3px] active:border-b-0"
          >
            Back to Dashboard
          </a>
        </div>
      ) : (
        // Keyed per question so answer/confidence/feedback state can't leak
        // from one drill item into the next (React reuses the instance otherwise).
        <DrillCard
          key={items[currentIndex].questionId}
          item={items[currentIndex]}
          onComplete={handleComplete}
        />
      )}
    </div>
  )
}
