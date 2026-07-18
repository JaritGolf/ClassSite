'use client'

/**
 * Lets a teacher pick which class's content override they're editing (or
 * see the global default as a disabled reference tab). An "Override" pill
 * marks any class that already has one; picking a class scope with an
 * existing override shows a "Reset to default" action.
 */

export interface ScopeClassOption {
  id: string
  name: string
  period: string | null
  hasOverride: boolean
}

export function ScopeSwitcher({
  classes,
  activeClassId,
  onSelectClass,
  onReset,
  resetting,
}: {
  classes: ScopeClassOption[]
  activeClassId: string | null
  onSelectClass: (classId: string) => void
  onReset: () => void
  resetting: boolean
}) {
  const activeHasOverride = classes.find((c) => c.id === activeClassId)?.hasOverride ?? false

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
      <span
        className="cursor-not-allowed rounded-md px-3 py-1.5 text-sm font-semibold text-gray-400"
        title="Global default is edited by an admin"
      >
        Global default
      </span>
      {classes.map((cls) => (
        <button
          key={cls.id}
          type="button"
          onClick={() => onSelectClass(cls.id)}
          aria-pressed={activeClassId === cls.id}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold ${
            activeClassId === cls.id
              ? 'bg-indigo-100 text-indigo-800'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {cls.name}
          {cls.period ? ` (P${cls.period})` : ''}
          {cls.hasOverride && (
            <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
              Override
            </span>
          )}
        </button>
      ))}
      {activeHasOverride && (
        <button
          type="button"
          onClick={onReset}
          disabled={resetting}
          className="ml-auto text-sm font-semibold text-gray-600 hover:text-rose-700 disabled:opacity-50"
        >
          {resetting ? 'Resetting…' : 'Reset to default'}
        </button>
      )}
    </div>
  )
}
