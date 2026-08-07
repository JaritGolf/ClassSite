'use client'

import type { InfographicContent } from '@/lib/lesson-content'
import { FormField, inputClasses, textareaClasses } from './form/FormField'
import { RepeatingFieldList } from './form/RepeatingFieldList'

type Block = InfographicContent['blocks'][number]
type BlockType = Block['type']

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  'big-number': 'Big number',
  fact: 'Fact',
  quote: 'Quote',
}

export function blankBlock(type: BlockType): Block {
  switch (type) {
    case 'big-number':
      return { type, value: '', label: '' }
    case 'fact':
      return { type, icon: 'star', text: '' }
    case 'quote':
      return { type, text: '', attribution: '' }
  }
}

function BlockFields({ block, update }: { block: Block; update: (patch: Partial<Block>) => void }) {
  if (block.type === 'big-number') {
    return (
      <div className="space-y-2">
        <input
          type="text"
          className={inputClasses}
          placeholder="Value (max 12 chars, e.g. 13)"
          value={block.value}
          onChange={(e) => update({ value: e.target.value })}
        />
        <input
          type="text"
          className={inputClasses}
          placeholder="Label"
          value={block.label}
          onChange={(e) => update({ label: e.target.value })}
        />
        <input
          type="text"
          className={inputClasses}
          placeholder="Detail (optional)"
          value={block.detail ?? ''}
          onChange={(e) => update({ detail: e.target.value || undefined })}
        />
      </div>
    )
  }
  if (block.type === 'fact') {
    return (
      <div className="space-y-2">
        <input
          type="text"
          className={inputClasses}
          placeholder="Icon name"
          value={block.icon}
          onChange={(e) => update({ icon: e.target.value })}
        />
        <input
          type="text"
          className={inputClasses}
          placeholder="Fact text"
          value={block.text}
          onChange={(e) => update({ text: e.target.value })}
        />
        <input
          type="text"
          className={inputClasses}
          placeholder="Detail (optional)"
          value={block.detail ?? ''}
          onChange={(e) => update({ detail: e.target.value || undefined })}
        />
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <textarea
        className={textareaClasses}
        placeholder="Quote text"
        value={block.text}
        onChange={(e) => update({ text: e.target.value })}
      />
      <input
        type="text"
        className={inputClasses}
        placeholder="Attribution"
        value={block.attribution}
        onChange={(e) => update({ attribution: e.target.value })}
      />
    </div>
  )
}

export function InfographicStepEditor({
  value,
  onChange,
  errors,
}: {
  value: InfographicContent
  onChange: (value: InfographicContent) => void
  errors?: Partial<Record<string, string>>
}) {
  return (
    <div className="space-y-4">
      <FormField label="Title" error={errors?.title}>
        {(props) => (
          <input
            {...props}
            type="text"
            className={inputClasses}
            value={value.title}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
          />
        )}
      </FormField>

      <FormField label="Intro (optional)" error={errors?.intro}>
        {(props) => (
          <input
            {...props}
            type="text"
            className={inputClasses}
            value={value.intro ?? ''}
            onChange={(e) => onChange({ ...value, intro: e.target.value || undefined })}
          />
        )}
      </FormField>

      <FormField
        label="Summary"
        hint="Full-text equivalent, always rendered. This is what read-aloud speaks and what a student gets if the panel can't be seen."
        error={errors?.summary}
      >
        {(props) => (
          <textarea
            {...props}
            className={textareaClasses}
            value={value.summary}
            onChange={(e) => onChange({ ...value, summary: e.target.value })}
          />
        )}
      </FormField>

      <FormField label="Blocks" hint="2 to 8 blocks." error={errors?.blocks}>
        {() => (
          <RepeatingFieldList
            items={value.blocks}
            onChange={(blocks) => onChange({ ...value, blocks })}
            newItem={() => blankBlock('fact')}
            minItems={2}
            maxItems={8}
            itemLabel="Block"
            renderItem={(block, i, update) => (
              <div className="space-y-2">
                <div className="flex gap-1" role="group" aria-label={`Block ${i + 1} type`}>
                  {(Object.keys(BLOCK_TYPE_LABELS) as BlockType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={block.type === t}
                      onClick={() => update(blankBlock(t))}
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        block.type === t
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {BLOCK_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
                <BlockFields block={block} update={(patch) => update({ ...block, ...patch } as Block)} />
              </div>
            )}
          />
        )}
      </FormField>
    </div>
  )
}
