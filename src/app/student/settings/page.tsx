'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Settings {
  pausePointMinutes: number
  reduceMotion: boolean
  highContrast: boolean
  largeText: boolean
  skipAllNpcs: boolean
  l1Language: string | null
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="rounded-2xl border-2 border-indigo-100 bg-white p-5 flex items-start gap-4 shadow-card">
      <div className="flex-1">
        <p className="font-display text-base font-bold text-gray-800">{label}</p>
        <p className="text-sm text-gray-600 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          checked ? 'bg-indigo-600 border-indigo-600' : 'bg-gray-200 border-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

export default function StudentSettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<Settings>({
    pausePointMinutes: 40,
    reduceMotion: false,
    highContrast: false,
    largeText: false,
    skipAllNpcs: false,
    l1Language: null,
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
      // Re-render the server layout so theme classes (contrast/large-text/motion) re-apply.
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-md px-4 py-8 text-center text-gray-600">Loading settings…</div>
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="font-display text-3xl font-bold text-indigo-900 mb-2">Student Settings</h1>
      <p className="text-base text-gray-600 mb-6">Tools turned on for you. Change them anytime.</p>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Pause-point */}
        <div className="rounded-2xl border-2 border-indigo-100 bg-white p-5 space-y-3 shadow-card">
          <label htmlFor="pause-slider" className="block font-display text-base font-bold text-gray-800">
            Pause-point reminder
          </label>
          <p className="text-sm text-gray-600">
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

        <Toggle
          label="High contrast"
          description="Switch to a high-contrast color scheme that's easier to read."
          checked={settings.highContrast}
          onChange={() => setSettings((s) => ({ ...s, highContrast: !s.highContrast }))}
        />

        <Toggle
          label="Large text"
          description="Increase the text size across the app. The layout reflows to fit."
          checked={settings.largeText}
          onChange={() => setSettings((s) => ({ ...s, largeText: !s.largeText }))}
        />

        <Toggle
          label="Reduce motion"
          description="Minimize animations and transitions throughout the app."
          checked={settings.reduceMotion}
          onChange={() => setSettings((s) => ({ ...s, reduceMotion: !s.reduceMotion }))}
        />

        <Toggle
          label="Skip NPC dialogue"
          description="Turn off the Founder, Skeptic, and Citizen overlays. You can turn them back on at any time."
          checked={settings.skipAllNpcs}
          onChange={() => setSettings((s) => ({ ...s, skipAllNpcs: !s.skipAllNpcs }))}
        />

        {/* L1 (first-language) glosses */}
        <div className="rounded-2xl border-2 border-indigo-100 bg-white p-5 space-y-2 shadow-card">
          <label htmlFor="l1-language" className="block font-display text-base font-bold text-gray-800">
            Translated word help (first language)
          </label>
          <p className="text-sm text-gray-600">
            Show an approved translation when you hover or tap a civics term.
          </p>
          <select
            id="l1-language"
            value={settings.l1Language ?? ''}
            onChange={(e) =>
              setSettings((s) => ({ ...s, l1Language: e.target.value === '' ? null : e.target.value }))
            }
            className="mt-1 w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <option value="">Off</option>
            <option value="es">Español (Spanish)</option>
            <option value="ht">Kreyòl Ayisyen (Haitian Creole)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 py-2.5 font-display text-base font-bold text-white hover:bg-indigo-500 active:translate-y-[3px] active:border-b-0 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}
