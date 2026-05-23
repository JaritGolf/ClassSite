'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * CSV-paste form for batch EOC score import.
 *
 * Expected CSV format (header row required):
 *   studentExternalKey,schoolYear,scaledScore,achievementLevel,consentAcknowledged
 *   12345678,2025-2026,350,3,true
 */
interface ImportResult {
  imported: number
  skipped: Array<{ row: Record<string, unknown>; reason: string }>
  auditLogId: string
}

export function ScoreImportForm() {
  const router = useRouter()
  const [csvText, setCsvText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const parseCsv = (text: string) => {
    const lines = text.trim().split('\n').filter((l) => l.trim())
    if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.')

    const headers = lines[0].split(',').map((h) => h.trim())
    const required = ['studentExternalKey', 'schoolYear', 'consentAcknowledged']
    for (const req of required) {
      if (!headers.includes(req)) throw new Error(`Missing required column: ${req}`)
    }

    return lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim())
      const row: Record<string, unknown> = {}
      headers.forEach((h, i) => {
        const v = values[i] ?? ''
        if (h === 'consentAcknowledged') {
          row[h] = v === 'true'
        } else if (h === 'scaledScore' || h === 'achievementLevel') {
          row[h] = v === '' ? undefined : Number(v)
        } else {
          row[h] = v
        }
      })
      return row
    })
  }

  const handleImport = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const rows = parseCsv(csvText)
      const res = await fetch('/api/admin/eoc-scores/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message ?? data.error ?? 'Import failed.')
        return
      }
      setResult(data)
      setCsvText('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900 mb-1">Import EOC Scores</h3>
        <p className="text-sm text-gray-600">
          Paste CSV data below. Required columns:{' '}
          <code className="bg-gray-100 px-1 rounded text-xs">studentExternalKey, schoolYear, consentAcknowledged</code>
          . Optional:{' '}
          <code className="bg-gray-100 px-1 rounded text-xs">scaledScore, achievementLevel</code>.
        </p>
      </div>

      <textarea
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        rows={8}
        placeholder={`studentExternalKey,schoolYear,scaledScore,achievementLevel,consentAcknowledged\nclever-id-1,2025-2026,350,3,true`}
        value={csvText}
        onChange={(e) => setCsvText(e.target.value)}
      />

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          <p className="font-medium">Import complete</p>
          <p>{result.imported} row{result.imported !== 1 ? 's' : ''} imported.</p>
          {result.skipped.length > 0 && (
            <p>{result.skipped.length} row{result.skipped.length !== 1 ? 's' : ''} skipped.</p>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleImport}
          disabled={loading || !csvText.trim()}
          className="inline-flex items-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Importing…' : 'Import Scores'}
        </button>
      </div>
    </div>
  )
}
