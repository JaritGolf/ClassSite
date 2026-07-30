'use client'

/**
 * LivePresencePanel — who is working right now, for mid-class monitoring.
 *
 * Polls the live-presence route every REFRESH_SECONDS while the teacher's tab
 * is visible (polling pauses when hidden, so a forgotten tab stops hammering
 * the endpoint). A manual refresh button is always available.
 *
 * Accessibility note: the auto-refreshing list is deliberately NOT an aria-live
 * region — announcing a 22-row roster every 30 seconds would make the page
 * unusable with a screen reader. The refresh button is the accessible path, and
 * it announces its own result via the status line.
 */

import { useCallback, useEffect, useState } from 'react'

const REFRESH_SECONDS = 30

interface PresenceRow {
  studentId: string
  displayName: string
  state: 'online' | 'idle' | 'offline'
  lastActiveAt: string | null
  activeMinutes: number
  currentArea: { area: string; label: string } | null
}

interface PresencePayload {
  classInfo: { id: string; name: string; studentCount: number }
  checkedAt: string
  onNow: PresenceRow[]
  idle: PresenceRow[]
  offline: PresenceRow[]
}

export function LivePresencePanel({ classId }: { classId: string }) {
  const [data, setData] = useState<PresencePayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchedAt, setFetchedAt] = useState<number | null>(null)
  const [secondsAgo, setSecondsAgo] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/teacher/activity/live?classId=${encodeURIComponent(classId)}`,
        { cache: 'no-store' }
      )
      if (!res.ok) {
        setError(
          res.status === 403
            ? 'You do not have access to this class.'
            : `Could not load live activity (${res.status}).`
        )
        return
      }
      setData((await res.json()) as PresencePayload)
      setError(null)
      setFetchedAt(Date.now())
    } catch {
      setError('Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }, [classId])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load()
    }, REFRESH_SECONDS * 1000)
    return () => window.clearInterval(timer)
  }, [load])

  // Drive the "updated Ns ago" label off a separate 1s tick so it stays honest
  // between polls without re-fetching.
  useEffect(() => {
    if (fetchedAt === null) return
    const tick = window.setInterval(
      () => setSecondsAgo(Math.round((Date.now() - fetchedAt) / 1000)),
      1000
    )
    setSecondsAgo(0)
    return () => window.clearInterval(tick)
  }, [fetchedAt])

  const onNow = data?.onNow ?? []
  const idle = data?.idle ?? []
  const offline = data?.offline ?? []
  const total = data?.classInfo.studentCount ?? 0

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">
          Working right now
          {data && (
            <span className="ml-2 font-normal text-gray-500">
              {onNow.length} of {total}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span role="status">
            {error
              ? 'Not updating'
              : fetchedAt === null
                ? 'Loading…'
                : `updated ${secondsAgo}s ago`}
          </span>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-md border border-gray-300 px-2 py-1 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <PresenceGroup
            title="On now"
            hint="Active in the last 2 minutes"
            dotClass="bg-green-500"
            rows={onNow}
            showArea
          />
          <PresenceGroup
            title="Idle"
            hint="No activity for 2–10 minutes"
            dotClass="bg-amber-400"
            rows={idle}
            showArea
          />
          <PresenceGroup
            title="Not on"
            hint="No activity in the last 10 minutes"
            dotClass="bg-gray-300"
            rows={offline}
          />
        </div>
      )}
    </section>
  )
}

function PresenceGroup({
  title,
  hint,
  dotClass,
  rows,
  showArea = false,
}: {
  title: string
  hint: string
  dotClass: string
  rows: PresenceRow[]
  showArea?: boolean
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <span
            aria-hidden="true"
            className={`inline-block h-2 w-2 rounded-full ${dotClass}`}
          />
          {title}
        </span>
        <span className="tabular-nums text-xs text-gray-400">{rows.length}</span>
      </div>
      <p className="mb-2 text-[11px] text-gray-400">{hint}</p>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-400">Nobody</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((r) => (
            <li key={r.studentId} className="text-sm">
              <span className="text-gray-800">{r.displayName}</span>
              {showArea && (
                <span className="ml-1 text-xs text-gray-500">
                  {r.currentArea ? r.currentArea.label : '—'}
                  {r.activeMinutes > 0 && ` · ${r.activeMinutes}m`}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
