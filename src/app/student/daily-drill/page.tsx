'use client'

import { useState, useEffect } from 'react'
import { DrillCard } from '@/components/student/drill/DrillCard'

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
      <div className="mx-auto max-w-2xl px-4 py-8 text-center text-gray-400">
        Loading drill queue…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Daily Republic Drill</h1>
        {items.length > 0 && !done && (
          <span className="text-sm text-gray-400">
            {currentIndex + 1} / {items.length}
          </span>
        )}
      </div>

      {done ? (
        <div className="text-center py-12 space-y-3">
          <p className="text-4xl">⚡</p>
          <p className="text-lg font-semibold text-gray-800">
            {items.length === 0 ? "All caught up for today!" : "Drill complete — great work!"}
          </p>
          <p className="text-sm text-gray-500">
            {items.length === 0
              ? "No items are due right now. Come back tomorrow!"
              : "Your spaced review state has been updated. See you tomorrow!"}
          </p>
          <a href="/student/dashboard" className="inline-block mt-4 rounded-lg bg-indigo-600 px-5 py-2 text-white font-medium hover:bg-indigo-700">
            Back to Dashboard
          </a>
        </div>
      ) : (
        <DrillCard item={items[currentIndex]} onComplete={handleComplete} />
      )}
    </div>
  )
}
