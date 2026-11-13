'use client'

/**
 * Save progress to a file / load it back.
 *
 * There is no account, so nothing can be restored from the server. A wiped or
 * swapped Chromebook starts empty unless the student saved a file first. Both
 * directions happen entirely in the browser: saving builds a file from
 * localStorage, loading reads a file the student picks. Nothing is uploaded.
 */

import { useRef, useState } from 'react'
import { useLocalProgress } from '@/lib/local-progress/useLocalProgress'
import { parseProgressFile, progressFileName, serializeProgress } from '@/lib/local-progress/file'
import { masteredCount } from '@/lib/local-progress/engine'
import { setProgress } from '@/lib/local-progress/store'

type Notice = { tone: 'ok' | 'error'; text: string } | null

export function ProgressBackup() {
  const { progress, hydrated } = useLocalProgress()
  const inputRef = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState<Notice>(null)

  function handleSave() {
    try {
      const blob = new Blob([serializeProgress(progress)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = progressFileName()
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setNotice({
        tone: 'ok',
        text: 'Saved. Keep the file somewhere you can find it again, like your Google Drive.',
      })
    } catch {
      setNotice({ tone: 'error', text: 'Your progress could not be saved to a file on this device.' })
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    const text = await file.text().catch(() => null)
    if (text === null) {
      setNotice({ tone: 'error', text: 'That file could not be opened.' })
      return
    }
    const result = parseProgressFile(text)
    if (!result.ok) {
      setNotice({ tone: 'error', text: result.reason })
      return
    }
    const incoming = masteredCount(result.progress)
    const current = masteredCount(progress)
    const replacing =
      current > 0
        ? `This device has ${current} mastered mission${current === 1 ? '' : 's'}. `
        : ''
    const ok = window.confirm(
      `${replacing}Load the saved file with ${incoming} mastered mission${
        incoming === 1 ? '' : 's'
      }? It will replace the progress on this device.`
    )
    if (!ok) return
    const saved = setProgress(result.progress)
    setNotice(
      saved
        ? { tone: 'ok', text: 'Loaded. Your saved progress is back on this device.' }
        : {
            tone: 'error',
            text: 'Loaded for now, but this device would not store it. It may be gone after you close the tab.',
          }
    )
  }

  return (
    <section
      aria-labelledby="backup-heading"
      className="rounded-2xl border-2 border-indigo-100 bg-white p-5 shadow-card"
    >
      <h2 id="backup-heading" className="font-display text-base font-bold text-gray-900">
        Save your progress
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-gray-700">
        Your progress is kept on this device only. If this Chromebook is wiped or you switch to a
        different one, save a file here first and load it on the new device. The file does not
        have your name in it.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!hydrated}
          className="rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-4 py-2 font-display text-sm font-bold text-white transition-colors hover:bg-indigo-500 active:translate-y-[3px] active:border-b-0 disabled:opacity-40"
        >
          Save progress to a file
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={!hydrated}
          className="rounded-2xl border-2 border-b-4 border-indigo-300 bg-white px-4 py-2 font-display text-sm font-bold text-indigo-700 transition-colors hover:bg-indigo-50 active:translate-y-[2px] active:border-b-2 disabled:opacity-40"
        >
          Load progress from a file
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="Choose a saved progress file"
          onChange={(e) => {
            void handleFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>
      {notice && (
        <p
          role="status"
          className={`mt-3 rounded-xl border px-3 py-2 text-sm font-semibold ${
            notice.tone === 'ok'
              ? 'border-green-200 bg-green-50 text-green-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          {notice.text}
        </p>
      )}
    </section>
  )
}
