'use client'

/**
 * Settings — options any student can switch on.
 *
 * These are choices, not records. Nothing here is granted by a teacher,
 * labelled, or reported: the options are saved in this browser and the server
 * is never told which ones are on. A student who needs large text and a
 * student who simply prefers it look exactly the same to this site — because
 * the site cannot see either of them.
 */

import { useLocalProgress } from '@/lib/local-progress/useLocalProgress'
import { updateSettings } from '@/lib/local-progress/engine'
import { clearProgress } from '@/lib/local-progress/store'
import type { LocalSettings } from '@/lib/local-progress/types'
import { ProgressBackup } from '@/components/student/ProgressBackup'

type ToggleKey =
  | 'readAloud'
  | 'sentenceChunking'
  | 'highContrast'
  | 'largeText'
  | 'extraTime'
  | 'reduceMotion'
  | 'skipStoryScenes'

const TOGGLES: { key: ToggleKey; label: string; help: string }[] = [
  {
    key: 'readAloud',
    label: 'Read aloud',
    help: 'Shows a clearly labelled “Read aloud” button on passages and notes so your device can read them to you.',
  },
  {
    key: 'sentenceChunking',
    label: 'One sentence per line',
    help: 'Breaks reading passages into one sentence per line, so you can take one idea at a time.',
  },
  {
    key: 'highContrast',
    label: 'High contrast',
    help: 'Black text on white with strong outlines, and no coloured backgrounds.',
  },
  {
    key: 'largeText',
    label: 'Large text',
    help: 'Makes the text bigger everywhere.',
  },
  {
    key: 'extraTime',
    label: 'Extra time',
    help: 'Nothing on this site is timed — you always have as long as you need. Turning this on also switches off the “time for a break” reminder.',
  },
  {
    key: 'reduceMotion',
    label: 'Less motion',
    help: 'Turns off animations like confetti and bouncing.',
  },
  {
    key: 'skipStoryScenes',
    label: 'Skip story scenes',
    help: 'Hides the character messages that appear on your dashboard.',
  },
]

export function StudentSettings() {
  const { progress, hydrated, update } = useLocalProgress()
  const settings = progress.settings

  function set(patch: Partial<LocalSettings>) {
    update((p) => updateSettings(p, patch))
    // Keep the passage toggle's own saved choice in step (see StimulusDisplay).
    if (patch.sentenceChunking !== undefined) {
      try {
        localStorage.setItem('civics-quest:sentence-chunking', String(patch.sentenceChunking))
      } catch {
        /* storage unavailable — the setting above still applies */
      }
    }
  }

  if (!hydrated) {
    return <p className="py-16 text-center text-base text-gray-600">Loading your settings…</p>
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-indigo-900">Settings</h1>
        <p className="mt-1 text-base text-gray-700">
          Switch on anything that helps you. These are saved on this device only — nobody else
          sees which ones you use.
        </p>
      </div>

      <section className="rounded-2xl border-2 border-indigo-100 bg-white p-5 shadow-card">
        <h2 className="font-display text-base font-bold text-gray-900">Reading and display</h2>
        <ul className="mt-3 divide-y divide-indigo-50">
          {TOGGLES.map((t) => {
            const id = `setting-${t.key}`
            return (
              <li key={t.key} className="flex items-start gap-3 py-3">
                <input
                  id={id}
                  type="checkbox"
                  checked={settings[t.key]}
                  onChange={(e) => set({ [t.key]: e.target.checked } as Partial<LocalSettings>)}
                  aria-describedby={`${id}-help`}
                  className="mt-1 h-5 w-5 flex-shrink-0 rounded border-gray-400 text-indigo-600"
                />
                <div>
                  <label htmlFor={id} className="font-display text-base font-bold text-gray-900">
                    {t.label}
                  </label>
                  <p id={`${id}-help`} className="text-sm leading-relaxed text-gray-700">
                    {t.help}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="rounded-2xl border-2 border-indigo-100 bg-white p-5 shadow-card">
        <h2 className="font-display text-base font-bold text-gray-900">Glossary language</h2>
        <p className="mt-1 text-sm leading-relaxed text-gray-700">
          Civics words can show a second definition in another language next to the English one.
        </p>
        <label htmlFor="gloss-language" className="mt-3 block text-sm font-semibold text-gray-800">
          Show glossary definitions in
        </label>
        <select
          id="gloss-language"
          value={settings.glossLanguage ?? ''}
          onChange={(e) =>
            set({ glossLanguage: e.target.value === 'es' || e.target.value === 'ht' ? e.target.value : null })
          }
          className="mt-1 w-full max-w-xs rounded-xl border-2 border-gray-300 bg-white px-3 py-2 text-base text-gray-900"
        >
          <option value="">English only</option>
          <option value="es">English + Español</option>
          <option value="ht">English + Kreyòl Ayisyen</option>
        </select>
      </section>

      <section className="rounded-2xl border-2 border-indigo-100 bg-white p-5 shadow-card">
        <h2 className="font-display text-base font-bold text-gray-900">Break reminder</h2>
        <label htmlFor="pause-minutes" className="mt-2 block text-sm font-semibold text-gray-800">
          Remind me to take a break after
        </label>
        <select
          id="pause-minutes"
          value={settings.pauseMinutes}
          disabled={settings.extraTime}
          onChange={(e) => set({ pauseMinutes: Number(e.target.value) })}
          className="mt-1 w-full max-w-xs rounded-xl border-2 border-gray-300 bg-white px-3 py-2 text-base text-gray-900 disabled:opacity-50"
        >
          {[10, 20, 30, 40, 60].map((m) => (
            <option key={m} value={m}>
              {m} minutes
            </option>
          ))}
        </select>
        {settings.extraTime && (
          <p className="mt-1 text-sm text-gray-700">Off while “Extra time” is switched on.</p>
        )}
      </section>

      <ProgressBackup />

      <section className="rounded-2xl border-2 border-red-100 bg-white p-5 shadow-card">
        <h2 className="font-display text-base font-bold text-gray-900">Start over on this device</h2>
        <p className="mt-1 text-sm leading-relaxed text-gray-700">
          Erases the progress saved in this browser. Use this on a shared Chromebook when you are
          done, after saving your progress to a file.
        </p>
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                'Erase all progress saved on this device? This cannot be undone unless you saved a file first.'
              )
            ) {
              clearProgress()
            }
          }}
          className="mt-3 rounded-2xl border-2 border-b-4 border-red-300 bg-white px-4 py-2 font-display text-sm font-bold text-red-700 transition-colors hover:bg-red-50 active:translate-y-[2px] active:border-b-2"
        >
          Erase progress on this device
        </button>
      </section>
    </div>
  )
}
