'use client'

import { useState } from 'react'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

interface Settings {
  rcSessionLengthOverride: number | null
  rcAttemptsAllowed: number
  rcReviewWindow: 'immediate' | 'after_submit' | 'after_class_window'
  rcStaminaOverride: number | null
  featureEocReviewEnabled: boolean
  strategyUsesRequired: number
}

interface Props {
  classId: string
  className: string
  initial: Settings
}

export function RcClassSettingsForm({ classId, className, initial }: Props) {
  const [settings, setSettings] = useState<Settings>(initial)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => ({ ...s, [key]: value }))
    setSavedAt(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/teacher/classes/${classId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setError(data.error ?? `Save failed (${res.status})`)
      } else {
        setSavedAt(new Date())
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-xl">
      <header>
        <h2 className="text-xl font-bold text-gray-900">
          <ExplainerHover
            theme="admin"
            variant="underline"
            title="Republic Challenge"
            text="The student-facing name for cumulative EOC-style review — optional practice sessions that mix questions across missions, separate from the graded Mastery Challenges."
          >
            Republic Challenge
          </ExplainerHover>{' '}
          — {className}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          These settings affect Quick Review, Mixed Mission, Endurance Trial, and Final
          Republic Trial for all students enrolled in this class.
        </p>
      </header>

      <Field
        label="Feature: Republic Challenge"
        hint="Disable to hide Republic Challenge from students in this class."
      >
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.featureEocReviewEnabled}
            onChange={(e) => update('featureEocReviewEnabled', e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">
            {settings.featureEocReviewEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </label>
      </Field>

      <Field
        label="Session-length override"
        hint="Override the default question count for Quick Review / Mixed / Category / Mistake Replay / Source Sprint. Leave blank to use mode defaults."
      >
        <NumberOrBlank
          value={settings.rcSessionLengthOverride}
          onChange={(v) => update('rcSessionLengthOverride', v)}
          min={1}
          max={100}
        />
      </Field>

      <Field
        label="Stamina override (Endurance Trial)"
        hint="Override the calendar-based stamina ladder. Leave blank to use the ladder (Aug-Oct = 10, …, Apr = 40)."
      >
        <NumberOrBlank
          value={settings.rcStaminaOverride}
          onChange={(v) => update('rcStaminaOverride', v)}
          min={1}
          max={100}
        />
      </Field>

      <Field label="Final Trial — attempts allowed" hint="How many times each student can attempt the Final Republic Trial.">
        <input
          type="number"
          min={1}
          max={10}
          value={settings.rcAttemptsAllowed}
          onChange={(e) => update('rcAttemptsAllowed', parseInt(e.target.value, 10) || 1)}
          className="rounded border border-gray-300 px-3 py-1.5 w-32"
        />
      </Field>

      <Field label="Final Trial — review window" hint="When students can see their results.">
        <select
          value={settings.rcReviewWindow}
          onChange={(e) =>
            update('rcReviewWindow', e.target.value as Settings['rcReviewWindow'])
          }
          className="rounded border border-gray-300 px-3 py-1.5"
        >
          <option value="immediate">Immediate (per-item feedback)</option>
          <option value="after_submit">After submit (score only)</option>
          <option value="after_class_window">After class window closes</option>
        </select>
      </Field>

      <div className="border-t border-gray-100 pt-4">
        <h3 className="text-sm font-bold text-gray-800">
          <ExplainerHover
            theme="admin"
            variant="underline"
            title="Strategist Track"
            text="A separate mini-progression that teaches test-taking strategies, apart from the civics content itself."
          >
            Strategist Track
          </ExplainerHover>
        </h3>
      </div>

      <Field
        label="Strategy uses required (per strategy)"
        hint="How many times each student must correctly apply EACH test-taking strategy. 0 = no requirement. Shown to students as a nudge; you can override per student on their profile."
      >
        <input
          type="number"
          min={0}
          max={20}
          value={settings.strategyUsesRequired}
          onChange={(e) =>
            update('strategyUsesRequired', parseInt(e.target.value, 10) || 0)
          }
          className="rounded border border-gray-300 px-3 py-1.5 w-32"
        />
      </Field>

      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {savedAt && <span className="text-sm text-green-600">Saved.</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-800 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}
      {children}
    </div>
  )
}

function NumberOrBlank({
  value,
  onChange,
  min,
  max,
}: {
  value: number | null
  onChange: (v: number | null) => void
  min: number
  max: number
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value ?? ''}
      placeholder="(default)"
      onChange={(e) => {
        const raw = e.target.value
        if (raw === '') onChange(null)
        else {
          const n = parseInt(raw, 10)
          if (!isNaN(n)) onChange(n)
        }
      }}
      className="rounded border border-gray-300 px-3 py-1.5 w-32"
    />
  )
}
