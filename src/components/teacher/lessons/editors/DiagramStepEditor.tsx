'use client'

import type { DiagramContent } from '@/lib/lesson-content'
import { FormField, inputClasses, textareaClasses } from './form/FormField'
import { RepeatingFieldList } from './form/RepeatingFieldList'

type Variant = DiagramContent['variant']

const VARIANT_LABELS: Record<Variant, string> = {
  flow: 'Flow (process steps)',
  cycle: 'Cycle (repeating steps)',
  venn: 'Venn (compare/contrast)',
  comparison: 'Comparison (2 columns)',
}

export function blankForVariant(variant: Variant, title: string, summary: string): DiagramContent {
  switch (variant) {
    case 'flow':
      return { variant: 'flow', title, summary, nodes: [{ label: '' }, { label: '' }] }
    case 'cycle':
      return {
        variant: 'cycle',
        title,
        summary,
        nodes: [{ label: '' }, { label: '' }, { label: '' }],
      }
    case 'venn':
      return {
        variant: 'venn',
        title,
        summary,
        left: { label: '', items: [''] },
        right: { label: '', items: [''] },
        shared: { label: '', items: [''] },
      }
    case 'comparison':
      return {
        variant: 'comparison',
        title,
        summary,
        columns: [
          { heading: '', items: ['', ''] },
          { heading: '', items: ['', ''] },
        ],
      }
  }
}

export function DiagramStepEditor({
  value,
  onChange,
  errors,
}: {
  value: DiagramContent
  onChange: (value: DiagramContent) => void
  errors?: Partial<Record<string, string>>
}) {
  function switchVariant(variant: Variant) {
    if (variant === value.variant) return
    const hasContent =
      value.variant === 'flow' || value.variant === 'cycle'
        ? value.nodes.some((n) => n.label)
        : value.variant === 'venn'
          ? value.left.items.some(Boolean) || value.right.items.some(Boolean)
          : value.columns.some((c) => c.items.some(Boolean))
    if (hasContent && !window.confirm('Switching diagram type will clear what you\'ve entered. Continue?')) {
      return
    }
    onChange(blankForVariant(variant, value.title, value.summary))
  }

  return (
    <div className="space-y-4">
      <FormField label="Diagram type">
        {() => (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Diagram type">
            {(Object.keys(VARIANT_LABELS) as Variant[]).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={value.variant === v}
                onClick={() => switchVariant(v)}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                  value.variant === v
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {VARIANT_LABELS[v]}
              </button>
            ))}
          </div>
        )}
      </FormField>

      <FormField label="Title" error={errors?.title}>
        {(props) => (
          <input
            {...props}
            type="text"
            className={inputClasses}
            value={value.title}
            onChange={(e) => onChange({ ...value, title: e.target.value } as DiagramContent)}
          />
        )}
      </FormField>

      <FormField
        label="Summary"
        hint="Full-text equivalent, always rendered (read-aloud target) — at least 40 characters."
        error={errors?.summary}
      >
        {(props) => (
          <textarea
            {...props}
            className={textareaClasses}
            value={value.summary}
            onChange={(e) => onChange({ ...value, summary: e.target.value } as DiagramContent)}
          />
        )}
      </FormField>

      {(value.variant === 'flow' || value.variant === 'cycle') && (
        <FormField
          label="Nodes"
          hint={value.variant === 'flow' ? '2 to 6 steps.' : '3 to 6 steps.'}
        >
          {() => (
            <RepeatingFieldList<{ label: string; detail?: string }>
              items={value.nodes}
              onChange={(nodes) => onChange({ ...value, nodes } as DiagramContent)}
              newItem={() => ({ label: '' })}
              minItems={value.variant === 'flow' ? 2 : 3}
              maxItems={6}
              itemLabel="Node"
              renderItem={(node, i, update) => (
                <div className="space-y-1">
                  <input
                    type="text"
                    className={inputClasses}
                    placeholder="Label"
                    maxLength={60}
                    value={node.label}
                    onChange={(e) => update({ label: e.target.value })}
                  />
                  <input
                    type="text"
                    className={inputClasses}
                    placeholder="Detail (optional)"
                    value={node.detail ?? ''}
                    onChange={(e) => update({ detail: e.target.value || undefined })}
                  />
                </div>
              )}
            />
          )}
        </FormField>
      )}

      {value.variant === 'venn' && (
        <div className="grid gap-4 sm:grid-cols-3">
          {(['left', 'right', 'shared'] as const).map((side) => (
            <FormField key={side} label={side === 'shared' ? 'Shared' : `${side} circle`}>
              {() => (
                <div className="space-y-2">
                  <input
                    type="text"
                    className={inputClasses}
                    placeholder="Label"
                    value={value[side].label}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        [side]: { ...value[side], label: e.target.value },
                      } as DiagramContent)
                    }
                  />
                  <RepeatingFieldList
                    items={value[side].items.map((text) => ({ text }))}
                    onChange={(items) =>
                      onChange({
                        ...value,
                        [side]: { ...value[side], items: items.map((i) => i.text) },
                      } as DiagramContent)
                    }
                    newItem={() => ({ text: '' })}
                    minItems={1}
                    maxItems={5}
                    itemLabel="Item"
                    renderItem={(item, i, update) => (
                      <input
                        type="text"
                        className={inputClasses}
                        value={item.text}
                        onChange={(e) => update({ text: e.target.value })}
                      />
                    )}
                  />
                </div>
              )}
            </FormField>
          ))}
        </div>
      )}

      {value.variant === 'comparison' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {value.columns.map((col, ci) => (
            <FormField key={ci} label={`Column ${ci + 1} heading`}>
              {() => (
                <div className="space-y-2">
                  <input
                    type="text"
                    className={inputClasses}
                    value={col.heading}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        columns: value.columns.map((c, idx) =>
                          idx === ci ? { ...c, heading: e.target.value } : c
                        ),
                      } as DiagramContent)
                    }
                  />
                  <RepeatingFieldList
                    items={col.items.map((text) => ({ text }))}
                    onChange={(items) =>
                      onChange({
                        ...value,
                        columns: value.columns.map((c, idx) =>
                          idx === ci ? { ...c, items: items.map((i) => i.text) } : c
                        ),
                      } as DiagramContent)
                    }
                    newItem={() => ({ text: '' })}
                    minItems={2}
                    maxItems={6}
                    itemLabel="Item"
                    renderItem={(item, i, update) => (
                      <input
                        type="text"
                        className={inputClasses}
                        value={item.text}
                        onChange={(e) => update({ text: e.target.value })}
                      />
                    )}
                  />
                </div>
              )}
            </FormField>
          ))}
        </div>
      )}
    </div>
  )
}
