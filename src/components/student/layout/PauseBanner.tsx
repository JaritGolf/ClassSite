'use client'

import { useEffect, useState } from 'react'

interface PauseBannerProps {
  pausePointMinutes: number
}

export function PauseBanner({ pausePointMinutes }: PauseBannerProps) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (dismissed) return
    const ms = pausePointMinutes * 60 * 1000
    const timer = setTimeout(() => setVisible(true), ms)
    return () => clearTimeout(timer)
  }, [pausePointMinutes, dismissed])

  if (!visible || dismissed) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl bg-indigo-700 px-5 py-3 text-white shadow-lg"
    >
      <span className="text-sm font-medium">
        Time for a break — your progress is saved.
      </span>
      <button
        onClick={() => {
          setVisible(false)
          setDismissed(true)
        }}
        aria-label="Dismiss break reminder"
        className="ml-2 rounded-full p-1 hover:bg-indigo-600 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
