'use client'

/**
 * Open or withhold one mission for students.
 *
 * Deliberately shows THREE states, not two, because a plain on/off switch here
 * would lie. The flag is only half of playability — the other half is content
 * (an approved lesson plus an approved mastery form). A benchmark can be
 * switched on and still be invisible to students because nothing is authored
 * yet, and a switch that appears to do nothing is worse than no switch.
 *
 * So: when content is missing, the control says so and stays disabled rather
 * than letting the teacher flip a bit with no effect.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

const ERROR_MESSAGES: Record<string, string> = {
  SUB_MODE_READ_ONLY: 'Substitute mode is read-only.',
  NOT_FOUND: 'Benchmark not found — try refreshing.',
}

export function ReadinessToggle({
  benchmarkId,
  readyForStudents,
  hasContent,
}: {
  benchmarkId: string
  readyForStudents: boolean
  hasContent: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggle() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/teacher/benchmarks/${benchmarkId}/readiness`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readyForStudents: !readyForStudents }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string }
        setError(ERROR_MESSAGES[data.code ?? data.error ?? ''] ?? 'Something went wrong — try again.')
        return
      }
      router.refresh()
    } catch {
      setError('Network error — try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!hasContent) {
    return (
      <ExplainerHover
        title="No content yet"
        text="This mission needs an approved lesson and an approved Mastery Challenge before students can open it. Turning it on now would do nothing, so the switch is disabled until the content is authored and approved."
        theme="admin"
      >
        <span className="whitespace-nowrap text-xs font-semibold text-gray-500">
          Needs content
        </span>
      </ExplainerHover>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <ExplainerHover
        title={readyForStudents ? 'Open to students' : 'Withheld from students'}
        text={
          readyForStudents
            ? 'Students can reach this mission on their Mission Map once they have cleared the missions before it. Turn it off to withhold it without deleting any content or student progress.'
            : "Students see this as Coming Soon — never a padlock, because it isn't something they failed to earn. Turn it on when you're ready to teach it."
        }
        theme="admin"
      >
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          aria-pressed={readyForStudents}
          className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
            readyForStudents
              ? 'border-green-300 bg-green-50 text-green-800 hover:bg-green-100'
              : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          {busy ? 'Saving…' : readyForStudents ? 'Open' : 'Withheld'}
        </button>
      </ExplainerHover>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
