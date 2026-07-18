'use client'

import type { TimelineContent } from '@/lib/lesson-content'
import { FormField, inputClasses, textareaClasses } from './form/FormField'
import { RepeatingFieldList } from './form/RepeatingFieldList'

export type PlainTextValue =
  | { mode: 'text'; text: string }
  | ({ mode: 'timeline' } & Omit<TimelineContent, 'kind'>)

function blankTimeline(): PlainTextValue {
  return {
    mode: 'timeline',
    connector: 'line',
    events: [{ marker: '', label: '' }, { marker: '', label: '' }, { marker: '', label: '' }],
  }
}

export function PlainTextStepEditor({
  value,
  onChange,
  errors,
  allowTimeline,
}: {
  value: PlainTextValue
  onChange: (value: PlainTextValue) => void
  errors?: Partial<Record<string, string>>
  allowTimeline: boolean
}) {
  return (
    <div className="space-y-4">
      {allowTimeline && (
        <div>
          {value.mode === 'text' ? (
            <button
              type="button"
              onClick={() => onChange(blankTimeline())}
              className="text-sm font-semibold text-indigo-700 hover:underline"
            >
              Convert to timeline layout →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('This will discard the timeline structure. Continue?')) {
                  onChange({ mode: 'text', text: '' })
                }
              }}
              className="text-sm font-semibold text-gray-600 hover:underline"
            >
              ← Convert back to plain paragraph
            </button>
          )}
        </div>
      )}

      {value.mode === 'text' ? (
        <FormField label="Text" error={errors?.text}>
          {(props) => (
            <textarea
              {...props}
              className={`${textareaClasses} min-h-[10rem]`}
              value={value.text}
              onChange={(e) => onChange({ mode: 'text', text: e.target.value })}
            />
          )}
        </FormField>
      ) : (
        <div className="space-y-4">
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
          <FormField label="Connector style">
            {() => (
              <select
                className={inputClasses}
                value={value.connector}
                onChange={(e) => onChange({ ...value, connector: e.target.value as 'line' | 'arrow' })}
              >
                <option value="line">Line</option>
                <option value="arrow">Arrow</option>
              </select>
            )}
          </FormField>
          <FormField label="Events" hint="3 to 8 events." error={errors?.events}>
            {() => (
              <RepeatingFieldList<{ marker: string; label: string; detail?: string }>
                items={value.events}
                onChange={(events) => onChange({ ...value, events })}
                newItem={() => ({ marker: '', label: '' })}
                minItems={3}
                maxItems={8}
                itemLabel="Event"
                renderItem={(event, i, update) => (
                  <div className="space-y-1">
                    <input
                      type="text"
                      className={inputClasses}
                      placeholder="Marker (e.g. 1215)"
                      maxLength={24}
                      value={event.marker}
                      onChange={(e) => update({ marker: e.target.value })}
                    />
                    <input
                      type="text"
                      className={inputClasses}
                      placeholder="Label"
                      value={event.label}
                      onChange={(e) => update({ label: e.target.value })}
                    />
                    <input
                      type="text"
                      className={inputClasses}
                      placeholder="Detail (optional)"
                      value={event.detail ?? ''}
                      onChange={(e) => update({ detail: e.target.value || undefined })}
                    />
                  </div>
                )}
              />
            )}
          </FormField>
        </div>
      )}
    </div>
  )
}
