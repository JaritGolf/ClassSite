'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface MissionRow {
  code: string
  title: string
  useCount: number
  required: number
  waived: boolean
  completedAt: Date | string | null
}

interface Props {
  studentId: string
  missions: MissionRow[]
}

/**
 * Per-student Strategist requirement editor. For each strategy the teacher can
 * override the required number of uses, waive it, or fall back to the class
 * default. Wired to POST /api/teacher/students/[studentId]/strategy-override.
 */
export function StrategyOverridePanel({ studentId, missions }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-1 text-sm font-semibold text-gray-700">Strategist Track</h2>
      <p className="mb-3 text-xs text-gray-500">
        Correct apply-it uses per strategy. Set a per-student required count or waive a
        strategy; leave the box blank to use the class default. Every change is audit-logged.
      </p>
      <div className="space-y-1.5">
        {missions.map((m) => (
          <StrategyRow key={m.code} studentId={studentId} mission={m} />
        ))}
      </div>
    </div>
  )
}

function StrategyRow({ studentId, mission }: { studentId: string; mission: MissionRow }) {
  const router = useRouter()
  const [required, setRequired] = useState<string>(
    mission.required > 0 ? String(mission.required) : ''
  )
  const [waived, setWaived] = useState(mission.waived)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  const met = mission.required > 0 && mission.useCount >= mission.required

  async function save() {
    setBusy(true)
    setMsg(null)
    try {
      const requiredUses =
        required.trim() === '' ? null : Math.max(0, parseInt(required, 10) || 0)
      const res = await fetch(
        `/api/teacher/students/${studentId}/strategy-override`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ missionCode: mission.code, requiredUses, waived }),
        }
      )
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { code?: string }
        setMsg({
          tone: 'err',
          text: data.code === 'SUB_MODE_READ_ONLY' ? 'Sub mode is on.' : `Failed (${res.status}).`,
        })
        return
      }
      setMsg({ tone: 'ok', text: 'Saved.' })
      router.refresh()
    } catch {
      setMsg({ tone: 'err', text: 'Network error.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 text-xs">
      <div className="min-w-[10rem] flex-1">
        <span className="font-medium text-gray-700">{mission.title}</span>
        <span className="ml-2 text-gray-400">
          used {mission.useCount}
          {mission.required > 0 && ` / ${mission.required}`}
          {waived ? ' · waived' : met ? ' · ✓ met' : ''}
        </span>
      </div>
      <label className="flex items-center gap-1 text-gray-600">
        req
        <input
          type="number"
          min={0}
          max={20}
          value={required}
          placeholder="cls"
          disabled={waived}
          onChange={(e) => setRequired(e.target.value)}
          className="w-14 rounded border border-gray-300 px-1.5 py-1 disabled:bg-gray-100"
        />
      </label>
      <label className="flex items-center gap-1 text-gray-600">
        <input
          type="checkbox"
          checked={waived}
          onChange={(e) => setWaived(e.target.checked)}
          className="rounded border-gray-300"
        />
        waive
      </label>
      <button
        onClick={save}
        disabled={busy}
        className="rounded-md bg-indigo-600 px-2.5 py-1 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {busy ? '…' : 'Save'}
      </button>
      {msg && (
        <span role="status" className={msg.tone === 'ok' ? 'text-green-600' : 'text-red-600'}>
          {msg.text}
        </span>
      )}
    </div>
  )
}
