'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ClassOption {
  id: string
  name: string
}

interface Props {
  benchmarkId: string
  classes: ClassOption[]
}

/**
 * Re-prime this benchmark's spaced review for a class: halves SM-2 intervals
 * and pulls dueAt forward so the material returns to the Daily Drill sooner.
 * Wired to POST /api/teacher/spaced-retrieval/reprime.
 */
export function ReprimeButton({ benchmarkId, classes }: Props) {
  const router = useRouter()
  const [classId, setClassId] = useState(classes[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  if (classes.length === 0) return null

  async function handleReprime() {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/teacher/spaced-retrieval/reprime', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ classId, benchmarkId }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        affectedStates?: number
        studentsAffected?: number
      }
      if (!res.ok) {
        setMsg({
          tone: 'err',
          text: data.error === 'SUB_MODE_READ_ONLY' ? 'Substitute mode is on.' : `Failed (${res.status}).`,
        })
        return
      }
      setMsg({
        tone: 'ok',
        text:
          (data.affectedStates ?? 0) === 0
            ? 'No active reviews to re-prime for this class yet.'
            : `Re-primed ${data.affectedStates} review${data.affectedStates === 1 ? '' : 's'} across ${data.studentsAffected} student${data.studentsAffected === 1 ? '' : 's'}.`,
      })
      router.refresh()
    } catch {
      setMsg({ tone: 'err', text: 'Network error.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {classes.length > 1 && (
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1 text-xs"
          aria-label="Class to re-prime"
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
      <button
        onClick={handleReprime}
        disabled={busy}
        className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {busy ? 'Re-priming…' : 'Re-prime this benchmark'}
      </button>
      {msg && (
        <span role="status" className={`text-xs ${msg.tone === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
          {msg.text}
        </span>
      )}
    </div>
  )
}
