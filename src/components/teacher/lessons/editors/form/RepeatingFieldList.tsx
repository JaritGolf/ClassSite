'use client'

/**
 * Generic accessible add/remove/move-up/move-down list editor, reused across
 * every array field in the content editors: thinkAloud[], diagram
 * nodes[]/items[], infographic blocks[], source-analysis
 * guidingQuestions[]/options[], timeline events[]. One implementation to
 * test and keep accessible instead of eight bespoke ones.
 */

export function RepeatingFieldList<T>({
  items,
  onChange,
  renderItem,
  newItem,
  minItems = 0,
  maxItems = Infinity,
  itemLabel = 'Item',
}: {
  items: T[]
  onChange: (items: T[]) => void
  renderItem: (item: T, index: number, update: (patch: Partial<T>) => void) => React.ReactNode
  newItem: () => T
  minItems?: number
  maxItems?: number
  itemLabel?: string
}) {
  function update(index: number, patch: Partial<T>) {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }
  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }
  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }
  function add() {
    onChange([...items, newItem()])
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-md border border-gray-200 bg-gray-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {itemLabel} {i + 1}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label={`Move ${itemLabel.toLowerCase()} ${i + 1} up`}
                className="rounded px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-30"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === items.length - 1}
                aria-label={`Move ${itemLabel.toLowerCase()} ${i + 1} down`}
                className="rounded px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-30"
              >
                ▼
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                disabled={items.length <= minItems}
                aria-label={`Remove ${itemLabel.toLowerCase()} ${i + 1}`}
                className="rounded px-1.5 py-0.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-30"
              >
                Remove
              </button>
            </div>
          </div>
          {renderItem(item, i, (patch) => update(i, patch))}
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        disabled={items.length >= maxItems}
        className="rounded-md border border-dashed border-gray-400 px-3 py-1.5 text-sm font-semibold text-gray-600 hover:border-indigo-400 hover:text-indigo-700 disabled:opacity-30"
      >
        + Add {itemLabel.toLowerCase()}
      </button>
    </div>
  )
}
