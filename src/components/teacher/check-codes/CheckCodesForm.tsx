'use client'

import { useState } from 'react'
import { extractCodes } from '@/lib/completion-codes/code'

interface Row {
  code: string
  valid: boolean
  reason: 'malformed' | 'bad-signature' | null
  benchmarkCode: string | null
  benchmarkTitle: string | null
  scorePercent: number | null
  date: string | null
  occurrences: number
}

const REASON_TEXT: Record<string, string> = {
  malformed: 'Not a complete code — part of it is missing or mistyped.',
  'bad-signature': 'Not genuine — this code was changed or was not issued by this site.',
}

export function CheckCodesForm() {
  const [text, setText] = useState('')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function check() {
    setMessage(null)
    setRows(null)
    // Extracted HERE, in the browser: only the codes are sent.
    const codes = extractCodes(text)
    if (codes.length === 0) {
      setMessage('No completion codes were found in what you pasted. A code starts with “MCC-”.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/teacher/completion-codes/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes: codes.slice(0, 500) }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data) throw new Error(data?.error ?? 'The codes could not be checked.')
      setRows(data.rows as Row[])
      if (codes.length > 500) setMessage('Only the first 500 codes were checked.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'The codes could not be checked.')
    } finally {
      setBusy(false)
    }
  }

  const valid = rows?.filter((r) => r.valid).length ?? 0

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="codes" className="block text-sm font-semibold text-gray-800">
          Paste codes (one per line, or a whole column copied from Classroom)
        </label>
        <textarea
          id="codes"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          spellCheck={false}
          className="mt-1 w-full rounded-lg border border-gray-300 p-3 font-mono text-sm text-gray-900"
          placeholder="MCC-1.1-100-20260914-7K2M9XD4AQ"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={check}
          disabled={busy || text.trim().length === 0}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
        >
          {busy ? 'Checking…' : 'Check codes'}
        </button>
        <button
          type="button"
          onClick={() => {
            setText('')
            setRows(null)
            setMessage(null)
          }}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Clear
        </button>
      </div>

      {message && (
        <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {message}
        </p>
      )}

      {rows && (
        <div className="space-y-2">
          <p role="status" className="text-sm font-semibold text-gray-800">
            {valid} of {rows.length} code{rows.length === 1 ? '' : 's'} genuine.
          </p>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  <th scope="col" className="px-3 py-2">Result</th>
                  <th scope="col" className="px-3 py-2">Code</th>
                  <th scope="col" className="px-3 py-2">Mission</th>
                  <th scope="col" className="px-3 py-2 text-right">Score</th>
                  <th scope="col" className="px-3 py-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r, i) => (
                  <tr key={`${r.code}-${i}`} data-testid="code-row" data-valid={r.valid}>
                    <td className="px-3 py-2">
                      {r.valid ? (
                        <span className="font-semibold text-green-700">✓ Genuine</span>
                      ) : (
                        <span className="font-semibold text-red-700">✗ Not valid</span>
                      )}
                      {r.occurrences > 1 && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                          appears {r.occurrences}×
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-800">{r.code}</td>
                    <td className="px-3 py-2 text-gray-800">
                      {r.valid ? (
                        <>
                          <span className="font-mono text-xs text-gray-600">{r.benchmarkCode}</span>{' '}
                          {r.benchmarkTitle ?? ''}
                        </>
                      ) : (
                        <span className="text-gray-700">{REASON_TEXT[r.reason ?? 'malformed']}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-800">
                      {r.scorePercent !== null ? `${r.scorePercent}%` : '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-800">{r.date ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
