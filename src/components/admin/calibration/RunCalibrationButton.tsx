'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface RunCalibrationButtonProps {
  schoolYear: string
}

export function RunCalibrationButton({ schoolYear }: RunCalibrationButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRun = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/calibration/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolYear }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.message ?? data.error ?? 'Calibration run failed.')
        return
      }
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleRun}
        disabled={loading}
        className="inline-flex items-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {loading ? 'Computing…' : 'Run Calibration'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
