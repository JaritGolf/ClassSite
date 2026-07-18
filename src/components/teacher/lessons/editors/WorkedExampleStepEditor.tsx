'use client'

import type { WorkedExampleContent } from '@/lib/lesson-content'
import { FormField, inputClasses, textareaClasses } from './form/FormField'
import { RepeatingFieldList } from './form/RepeatingFieldList'

export function WorkedExampleStepEditor({
  value,
  onChange,
  errors,
}: {
  value: WorkedExampleContent
  onChange: (value: WorkedExampleContent) => void
  errors?: Partial<Record<string, string>>
}) {
  return (
    <div className="space-y-4">
      <FormField label="Problem" error={errors?.problem}>
        {(props) => (
          <textarea
            {...props}
            className={textareaClasses}
            value={value.problem}
            onChange={(e) => onChange({ ...value, problem: e.target.value })}
          />
        )}
      </FormField>

      <FormField
        label="Think-aloud steps"
        hint="2 to 8 expert reasoning steps, revealed one at a time."
        error={errors?.thinkAloud}
      >
        {() => (
          <RepeatingFieldList
            items={value.thinkAloud.map((text) => ({ text }))}
            onChange={(items) => onChange({ ...value, thinkAloud: items.map((i) => i.text) })}
            newItem={() => ({ text: '' })}
            minItems={2}
            maxItems={8}
            itemLabel="Step"
            renderItem={(item, i, update) => (
              <textarea
                className={textareaClasses}
                value={item.text}
                onChange={(e) => update({ text: e.target.value })}
                aria-label={`Think-aloud step ${i + 1}`}
              />
            )}
          />
        )}
      </FormField>

      <FormField label="Answer" error={errors?.answer}>
        {(props) => (
          <input
            {...props}
            type="text"
            className={inputClasses}
            value={value.answer}
            onChange={(e) => onChange({ ...value, answer: e.target.value })}
          />
        )}
      </FormField>

      <FormField label="Why this works" error={errors?.whyItWorks}>
        {(props) => (
          <textarea
            {...props}
            className={textareaClasses}
            value={value.whyItWorks}
            onChange={(e) => onChange({ ...value, whyItWorks: e.target.value })}
          />
        )}
      </FormField>
    </div>
  )
}
