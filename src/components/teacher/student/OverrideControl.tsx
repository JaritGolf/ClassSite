'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

interface BenchmarkOption {
  benchmarkId: string
  code: string
  title: string
}

interface Props {
  studentId: string
  benchmarks: BenchmarkOption[]
}

const ACTIONS: Array<{ value: string; label: string }> = [
  { value: 'UNLOCK_BENCHMARK', label: 'Unlock benchmark' },
  { value: 'MARK_MASTERED', label: 'Mark mastered' },
  { value: 'MARK_EXPOSURE_COMPLETE', label: 'Mark exposure complete (off-ramp)' },
  { value: 'ASSIGN_REMEDIATION', label: 'Assign remediation' },
  { value: 'EXTEND_DEADLINE', label: 'Extend deadline' },
  { value: 'CUSTOM', label: 'Custom / conference note' },
]

/**
 * Teacher override panel. Applies a mastery override to a benchmark for this
 * student, writing a TeacherOverride + audit log. Wired to
 * POST /api/mastery/[benchmarkId]/override.
 */
export function OverrideControl({ studentId, benchmarks }: Props) {
  const router = useRouter()
  const [benchmarkId, setBenchmarkId] = useState(benchmarks[0]?.benchmarkId ?? '')
  const [action, setAction] = useState('UNLOCK_BENCHMARK')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  async function handleApply(e: React.FormEvent) {
    e.preventDefault()
    if (!benchmarkId || reason.trim().length === 0) {
      setMsg({ tone: 'err', text: 'Pick a benchmark and enter a reason.' })
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/mastery/${benchmarkId}/override`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ studentId, action, reason: reason.trim() }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string }
        setMsg({
          tone: 'err',
          text:
            data.code === 'NOT_FOUND'
              ? 'No progress row for that benchmark yet — try Unlock first.'
              : `Failed (${res.status}).`,
        })
        return
      }
      setReason('')
      setMsg({ tone: 'ok', text: 'Override applied.' })
      router.refresh()
    } catch {
      setMsg({ tone: 'err', text: 'Network error.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <ExplainerHover
        title="Teacher Override"
        text="Manually change a student's benchmark status — for a conference decision, a data-entry fix, or a case the engine's automatic rules don't fit. Every override is permanently recorded in the audit log with your reason."
        theme="admin"
      >
        <h2 className="mb-1 text-sm font-semibold text-gray-700">Teacher Override</h2>
      </ExplainerHover>
      <p className="mb-3 text-xs text-gray-500">
        Manually adjust this student&apos;s progress on a benchmark. Every override is recorded in
        the audit log.
      </p>
      <form onSubmit={handleApply} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-gray-600">
            Benchmark
            <select
              value={benchmarkId}
              onChange={(e) => setBenchmarkId(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              {benchmarks.map((b) => (
                <option key={b.benchmarkId} value={b.benchmarkId}>
                  {b.code} — {b.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-gray-600">
            Action
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              {ACTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-xs font-medium text-gray-600">
          Reason (required)
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Why are you overriding? (recorded in the audit log)"
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? 'Applying…' : 'Apply override'}
          </button>
          {msg && (
            <span
              role="status"
              className={`text-xs ${msg.tone === 'ok' ? 'text-green-600' : 'text-red-600'}`}
            >
              {msg.text}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
