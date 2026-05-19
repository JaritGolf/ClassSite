'use client'

import { useState, useEffect } from 'react'

interface Settings {
  pausePointMinutes: number
  reduceMotion: boolean
  skipAllNpcs: boolean
}

export default function StudentSettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    pausePointMinutes: 40,
    reduceMotion: false,
    skipAllNpcs: false,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/student/settings')
      .then((r) => r.json())
      .then((data: Settings) => setSettings(data))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/student/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      // Sync NPC skip state to narrative API
      await fetch('/api/narrative/skip-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skip: settings.skipAllNpcs }),
      })

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-md px-4 py-8 text-center text-gray-400">Loading settings…</div>
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Student Settings</h1>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Pause-point */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <label htmlFor="pause-slider" className="block text-sm font-semibold text-gray-700">
            Pause-point reminder
          </label>
          <p className="text-xs text-gray-500">
            Get a break reminder after this many minutes of activity.
          </p>
          <div className="flex items-center gap-3">
            <input
              id="pause-slider"
              type="range"
              min={5}
              max={120}
              step={5}
              value={settings.pausePointMinutes}
              onChange={(e) => setSettings((s) => ({ ...s, pausePointMinutes: parseInt(e.target.value) }))}
              className="flex-1 accent-indigo-600"
            />
            <span className="w-16 text-right text-sm font-medium text-gray-700">
              {settings.pausePointMinutes} min
            </span>
          </div>
        </div>

        {/* Skip NPCs */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 flex items-start gap-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-700">Skip NPC dialogue</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Turn off the Founder, Skeptic, and Citizen overlays. You can turn them back on at any time.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.skipAllNpcs}
            onClick={() => setSettings((s) => ({ ...s, skipAllNpcs: !s.skipAllNpcs }))}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              settings.skipAllNpcs ? 'bg-indigo-600 border-indigo-600' : 'bg-gray-200 border-gray-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform mt-0.5 ${settings.skipAllNpcs ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* Reduce motion */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 flex items-start gap-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-700">Reduce motion</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Minimize animations and transitions throughout the app.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.reduceMotion}
            onClick={() => setSettings((s) => ({ ...s, reduceMotion: !s.reduceMotion }))}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              settings.reduceMotion ? 'bg-indigo-600 border-indigo-600' : 'bg-gray-200 border-gray-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform mt-0.5 ${settings.reduceMotion ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}
