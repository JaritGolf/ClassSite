'use client'

/**
 * StrategyTrackList
 *
 * Renders the Test-Taking Strategy missions (spec §19.2) as interactive
 * apply-it rounds. Each round is graded server-side; a correct round counts as
 * one "use" of the strategy (POST /api/strategy/[code]/attempt). A teacher may
 * require a number of uses per strategy — shown as a soft "X to go" nudge.
 */

import { useMemo, useState } from 'react'
import type { StrategyMissionServed, StrategyProgressRecord } from '@/lib/strategy-track'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

interface CheckResult {
  checkIndex: number
  correct: boolean
  correctOptionId: string
  feedback: string
}
interface RoundResult {
  correct: boolean
  useCount: number
  checks: CheckResult[]
}

interface Props {
  missions: StrategyMissionServed[]
  progress: StrategyProgressRecord[]
}

export function StrategyTrackList({ missions, progress }: Props) {
  const progressByCode = useMemo(
    () => new Map(progress.map((p) => [p.code, p])),
    [progress]
  )
  // Live use-counts so the header nudge updates as the student earns uses.
  const [useCounts, setUseCounts] = useState<Record<string, number>>(
    () => Object.fromEntries(progress.map((p) => [p.code, p.useCount]))
  )

  const totalOwed = progress.reduce(
    (sum, p) => sum + Math.max(0, p.required - (useCounts[p.code] ?? 0)),
    0
  )

  return (
    <div className="space-y-4">
      {totalOwed > 0 && (
        <div
          role="status"
          className="rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-base font-semibold text-amber-900"
        >
          🎯 You owe {totalOwed} more strategy {totalOwed === 1 ? 'use' : 'uses'}. Nail an
          apply-it round to check one off.
        </div>
      )}
      {missions.map((m) => (
        <MissionCard
          key={m.code}
          mission={m}
          record={progressByCode.get(m.code)}
          useCount={useCounts[m.code] ?? 0}
          onUse={(count) => setUseCounts((prev) => ({ ...prev, [m.code]: count }))}
        />
      ))}
    </div>
  )
}

function MissionCard({
  mission,
  record,
  useCount,
  onUse,
}: {
  mission: StrategyMissionServed
  record: StrategyProgressRecord | undefined
  useCount: number
  onUse: (count: number) => void
}) {
  const required = record?.required ?? 0
  const met = required === 0 || useCount >= required

  const [selections, setSelections] = useState<Record<number, string>>({})
  const [result, setResult] = useState<RoundResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allAnswered = mission.checks.every((_, i) => selections[i] != null)

  async function handleSubmit() {
    setBusy(true)
    setError(null)
    try {
      const answers = mission.checks.map((_, i) => ({
        checkIndex: i,
        optionId: selections[i],
      }))
      const res = await fetch(`/api/strategy/${mission.code}/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Could not submit your answers.')
      }
      const data = (await res.json()) as RoundResult
      setResult(data)
      if (data.correct) onUse(data.useCount)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit your answers.')
    } finally {
      setBusy(false)
    }
  }

  function tryAgain() {
    setSelections({})
    setResult(null)
    setError(null)
  }

  const resultByCheck = new Map((result?.checks ?? []).map((c) => [c.checkIndex, c]))

  return (
    <div className="space-y-3 rounded-2xl border-2 border-purple-100 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <ExplainerHover
          title="Strategist Track"
          text="A parallel skill track for test-taking strategies — separate from your missions. Nail an 'Apply it' round below to log one use."
          variant="plain"
        >
          <span className="font-display text-xs font-bold uppercase tracking-widest text-purple-600">
            Strategist
          </span>
        </ExplainerHover>
        {required === 0 ? (
          <span className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">
            Optional
          </span>
        ) : met ? (
          <ExplainerHover
            title="Uses"
            text="A 'use' is one correct Apply It round. Your teacher set how many uses this strategy needs — you've met it!"
            variant="plain"
          >
            <span className="rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800">
              ✓ {useCount} / {required} done
            </span>
          </ExplainerHover>
        ) : (
          <ExplainerHover
            title="Uses"
            text="A 'use' is one correct Apply It round. Your teacher set how many uses this strategy needs — this shows how many more you need."
            variant="plain"
          >
            <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
              {useCount} / {required} · {required - useCount} to go
            </span>
          </ExplainerHover>
        )}
        {required === 0 && useCount > 0 && (
          <span className="text-xs font-semibold text-gray-500">Used {useCount}×</span>
        )}
      </div>

      <h2 className="font-display text-xl font-bold text-gray-900">{mission.title}</h2>
      <p className="text-base text-gray-600">{mission.objective}</p>
      <p className="text-base leading-7 text-gray-700">{mission.instructions}</p>
      <details className="text-base">
        <summary className="cursor-pointer select-none font-semibold text-purple-700 hover:underline">
          💡 Strategy tip
        </summary>
        <p className="mt-2 rounded-r-xl border-l-4 border-purple-300 bg-purple-50 py-2 pl-4 pr-3 text-gray-700">
          {mission.tip}
        </p>
      </details>

      {/* Apply-it round */}
      <div className="mt-2 space-y-4 rounded-xl border border-purple-100 bg-purple-50/40 p-4">
        <p className="font-display text-sm font-bold uppercase tracking-wide text-purple-700">
          Apply it
        </p>
        {mission.checks.map((check, i) => {
          const cr = resultByCheck.get(i)
          return (
            <div key={i} className="space-y-2">
              {check.stimulus && (
                <p className="rounded-lg border-l-4 border-purple-300 bg-white px-3 py-2 text-base italic text-gray-700">
                  {check.stimulus}
                </p>
              )}
              <p className="text-base font-medium text-gray-800">{check.prompt}</p>
              <div className="grid gap-2">
                {check.options.map((opt) => {
                  const selected = selections[i] === opt.id
                  const isCorrect = cr && opt.id === cr.correctOptionId
                  const isWrongChoice = cr && selected && !cr.correct
                  let cls =
                    'flex items-start gap-2 rounded-xl border-2 px-3 py-2 text-left text-base transition-colors'
                  if (cr) {
                    if (isCorrect) cls += ' border-green-400 bg-green-50 text-green-900'
                    else if (isWrongChoice) cls += ' border-red-400 bg-red-50 text-red-900'
                    else cls += ' border-gray-200 bg-white text-gray-600'
                  } else if (selected) {
                    cls += ' border-purple-500 bg-purple-100 text-purple-900'
                  } else {
                    cls += ' border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                  }
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={!!result || busy}
                      onClick={() =>
                        setSelections((prev) => ({ ...prev, [i]: opt.id }))
                      }
                      className={cls}
                    >
                      <span aria-hidden="true" className="font-bold">
                        {isCorrect ? '✓' : isWrongChoice ? '✗' : '○'}
                      </span>
                      <span>{opt.text}</span>
                    </button>
                  )
                })}
              </div>
              {cr && (
                <p
                  className={`rounded-lg px-3 py-2 text-sm ${
                    cr.correct
                      ? 'bg-green-50 text-green-800'
                      : 'bg-amber-50 text-amber-900'
                  }`}
                >
                  {cr.feedback}
                </p>
              )}
            </div>
          )
        })}

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {!result ? (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || busy}
            className="rounded-2xl border-b-4 border-purple-800 bg-purple-600 px-4 py-2 font-display text-sm font-bold text-white transition-colors hover:bg-purple-500 active:translate-y-[3px] active:border-b-0 disabled:opacity-50"
          >
            {busy ? 'Checking…' : 'Submit round'}
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`font-display text-sm font-bold ${
                result.correct ? 'text-green-700' : 'text-amber-700'
              }`}
            >
              {result.correct
                ? '🎉 Nice — that counts as a use!'
                : 'Not quite — no use counted. Try again!'}
            </span>
            <button
              onClick={tryAgain}
              className="rounded-2xl border-b-4 border-purple-800 bg-purple-600 px-4 py-2 font-display text-sm font-bold text-white transition-colors hover:bg-purple-500 active:translate-y-[3px] active:border-b-0"
            >
              {result.correct ? 'Do another round' : 'Try again'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
