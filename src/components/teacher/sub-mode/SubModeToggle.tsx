'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SubModeToggleProps {
  initialOn: boolean
}

export function SubModeToggle({ initialOn }: SubModeToggleProps) {
  const router = useRouter()
  const [on, setOn] = useState(initialOn)
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    setLoading(true)
    try {
      const res = await fetch('/api/teacher/sub-mode/toggle', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ on: !on }),
      })
      if (res.ok) {
        setOn(!on)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handleToggle}
        disabled={loading}
        aria-pressed={on}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
          on ? 'bg-indigo-600' : 'bg-gray-200'
        } disabled:opacity-50`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            on ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <span className="text-sm text-gray-700">
        {on ? (
          <span className="font-medium text-indigo-700">Substitute mode ON</span>
        ) : (
          'Substitute mode off'
        )}
      </span>
    </div>
  )
}
