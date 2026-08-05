'use client'

import { useState } from 'react'
import { ExplainerHover } from '@/components/ui/ExplainerHover'
import type { ProgressPlanView, TargetOption } from '@/lib/progress-checkpoints'

interface ProgressTargetsFormProps {
  classId: string
  className: string
  initial: ProgressPlanView
}

const LEVELS = [1, 2, 3, 4] as const

/** Local editable shape: level -> benchmarkId ('' means not set). */
interface CheckpointDraft {
  checkpointNumber: number
  endsOn: string
  targets: Record<number, string>
}

function toDraft(view: ProgressPlanView): CheckpointDraft[] {
  return view.checkpoints.map((cp) => {
    const targets: Record<number, string> = { 1: '', 2: '', 3: '', 4: '' }
    for (const t of cp.targets) targets[t.level] = t.benchmarkId
    return {
      checkpointNumber: cp.checkpointNumber,
      endsOn: cp.endsOn ?? '',
      targets,
    }
  })
}

export function ProgressTargetsForm({ classId, className, initial }: ProgressTargetsFormProps) {
  const [drafts, setDrafts] = useState<CheckpointDraft[]>(toDraft(initial))
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [problems, setProblems] = useState<string[]>([])

  const optionsByUnit = groupByUnit(initial.targetOptions)

  function updateDate(checkpointNumber: number, endsOn: string) {
    setDrafts((prev) =>
      prev.map((d) => (d.checkpointNumber === checkpointNumber ? { ...d, endsOn } : d))
    )
    setSavedAt(null)
  }

  function updateTarget(checkpointNumber: number, level: number, benchmarkId: string) {
    setDrafts((prev) =>
      prev.map((d) =>
        d.checkpointNumber === checkpointNumber
          ? { ...d, targets: { ...d.targets, [level]: benchmarkId } }
          : d
      )
    )
    setSavedAt(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setProblems([])
    try {
      const payload = {
        checkpoints: drafts.map((d) => ({
          checkpointNumber: d.checkpointNumber,
          endsOn: d.endsOn === '' ? null : d.endsOn,
          targets: LEVELS.filter((l) => d.targets[l] !== '').map((l) => ({
            level: l,
            benchmarkId: d.targets[l],
          })),
        })),
      }
      const res = await fetch(`/api/teacher/classes/${classId}/progress-targets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? `Save failed (${res.status})`)
        if (Array.isArray(data.problems)) {
          setProblems(data.problems.map((p: { message: string }) => p.message))
        }
        return
      }
      setSavedAt(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700">
          <ExplainerHover
            theme="admin"
            title="Nine-Week Progress Targets"
            text={
              'Pick a date and up to four target missions for each nine weeks. A student’s ' +
              'Level is how far along that ladder they reached by the date. Students only ever ' +
              'see the Level — and nothing here restricts what they can work on, so a student ' +
              'who runs ahead keeps going.'
            }
          >
            <span>Nine-Week Progress Targets</span>
          </ExplainerHover>
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          {className} · school year {initial.schoolYear}
        </p>

        <p className="mt-3 text-xs text-gray-600">
          <strong>{initial.eligibleCount} of {initial.totalCount} missions</strong> currently have
          the content a student needs to complete them. Missions without content are listed but
          cannot be chosen — their reason is shown in the dropdown.
        </p>

        {initial.appliesToClasses.length > 0 && (
          <p className="mt-2 text-xs text-gray-600">
            Applies to:{' '}
            {initial.appliesToClasses
              .map((c) => (c.period ? `${c.name} (Period ${c.period})` : c.name))
              .join(' · ')}
          </p>
        )}
        {initial.usesOwnPlan && (
          <p className="mt-2 text-xs text-indigo-700">
            This class is on its own schedule, separate from your other classes.
          </p>
        )}
      </div>

      {drafts.map((draft) => {
        const setLevels = LEVELS.filter((l) => draft.targets[l] !== '')
        const unsetLevels = LEVELS.filter((l) => !setLevels.includes(l))
        const ceiling =
          setLevels.length === 0
            ? 'No levels set yet.'
            : `${setLevels.length === 1 ? 'Level' : 'Levels'} ${setLevels.join(', ')} set.` +
              (unsetLevels.length > 0
                ? ` ${unsetLevels.length === 1 ? 'Level' : 'Levels'} ${unsetLevels.join(', ')} ` +
                  `${unsetLevels.length === 1 ? 'opens' : 'open'} up when more mission content lands.`
                : '')

        return (
          <div key={draft.checkpointNumber} className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-bold text-gray-800">
              Quarter {draft.checkpointNumber}
              <span className="ml-2 font-normal text-gray-500">
                (nine weeks {draft.checkpointNumber})
              </span>
            </h3>

            <div className="mt-3">
              <label
                className="mb-1 block text-sm font-medium text-gray-800"
                htmlFor={`endsOn-${draft.checkpointNumber}`}
              >
                End date
              </label>
              <p className="mb-2 text-xs text-gray-500">
                The last day that counts toward this quarter&apos;s Level. Leave blank to turn this
                quarter off.
              </p>
              <input
                id={`endsOn-${draft.checkpointNumber}`}
                type="date"
                value={draft.endsOn}
                onChange={(e) => updateDate(draft.checkpointNumber, e.target.value)}
                className="w-44 rounded border border-gray-300 px-3 py-1.5"
              />
            </div>

            <div className="mt-4 space-y-3">
              {LEVELS.map((level) => (
                <div key={level}>
                  <label
                    className="mb-1 block text-sm font-medium text-gray-800"
                    htmlFor={`t-${draft.checkpointNumber}-${level}`}
                  >
                    Level {level} target
                  </label>
                  <select
                    id={`t-${draft.checkpointNumber}-${level}`}
                    value={draft.targets[level]}
                    onChange={(e) => updateTarget(draft.checkpointNumber, level, e.target.value)}
                    className="w-full max-w-xl rounded border border-gray-300 px-3 py-1.5"
                  >
                    <option value="">(not set)</option>
                    {optionsByUnit.map((group) => (
                      <optgroup
                        key={group.unitId}
                        label={`Unit ${group.unitSequenceOrder} — ${group.unitTitle}`}
                      >
                        {group.options.map((o) => (
                          <option key={o.benchmarkId} value={o.benchmarkId} disabled={!o.eligible}>
                            {o.code} — {o.title}
                            {o.eligible ? '' : ` (${o.unavailableReason})`}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <p className="mt-3 text-xs text-gray-500">{ceiling}</p>
          </div>
        )
      })}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          Save targets
        </button>
        {saving && <span className="text-sm text-gray-500">Saving…</span>}
        {!saving && savedAt && <span className="text-sm text-green-700">Saved.</span>}
        {!saving && error && <span className="text-sm text-red-700">{error}</span>}
      </div>

      {problems.length > 0 && (
        <ul className="list-inside list-disc rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {problems.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── helpers ───────────────────────────────────────────────────────────────────

interface UnitGroup {
  unitId: string
  unitTitle: string
  unitSequenceOrder: number
  options: TargetOption[]
}

function groupByUnit(options: TargetOption[]): UnitGroup[] {
  const byUnit = new Map<string, UnitGroup>()
  for (const o of options) {
    let group = byUnit.get(o.unitId)
    if (!group) {
      group = {
        unitId: o.unitId,
        unitTitle: o.unitTitle,
        unitSequenceOrder: o.unitSequenceOrder,
        options: [],
      }
      byUnit.set(o.unitId, group)
    }
    group.options.push(o)
  }
  return [...byUnit.values()].sort((a, b) => a.unitSequenceOrder - b.unitSequenceOrder)
}
