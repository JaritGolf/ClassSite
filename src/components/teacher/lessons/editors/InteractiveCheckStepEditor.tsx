'use client'

import type { InteractiveCheckContent } from '@/lib/lesson-content'
import { FormField, inputClasses, textareaClasses } from './form/FormField'

export function InteractiveCheckStepEditor({
  value,
  onChange,
  errors,
}: {
  value: InteractiveCheckContent
  onChange: (value: InteractiveCheckContent) => void
  errors?: Partial<Record<string, string>>
}) {
  function updateOption(i: number, patch: Partial<InteractiveCheckContent['options'][number]>) {
    onChange({
      ...value,
      options: value.options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)),
    })
  }
  function setCorrect(i: number) {
    onChange({
      ...value,
      options: value.options.map((o, idx) => ({ ...o, correct: idx === i })),
    })
  }

  return (
    <div className="space-y-4">
      <FormField label="Question" error={errors?.question}>
        {(props) => (
          <textarea
            {...props}
            className={textareaClasses}
            value={value.question}
            onChange={(e) => onChange({ ...value, question: e.target.value })}
          />
        )}
      </FormField>

      <div className="space-y-2" role="group" aria-label="Answer options">
        <span className="block text-sm font-semibold text-gray-800">Options (mark the correct one)</span>
        {value.options.map((opt, i) => (
          <div key={i} className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-start gap-2">
              <input
                type="radio"
                name="correct-option"
                checked={opt.correct}
                onChange={() => setCorrect(i)}
                aria-label={`Option ${i + 1} is correct`}
                className="mt-2"
              />
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  className={inputClasses}
                  placeholder={`Option ${i + 1} text`}
                  value={opt.text}
                  onChange={(e) => updateOption(i, { text: e.target.value })}
                />
                <input
                  type="text"
                  className={inputClasses}
                  placeholder="Feedback shown after choosing this option"
                  value={opt.feedback}
                  onChange={(e) => updateOption(i, { feedback: e.target.value })}
                />
              </div>
            </div>
          </div>
        ))}
        {errors?.options && (
          <p role="alert" className="text-xs font-semibold text-rose-700">
            {errors.options}
          </p>
        )}
      </div>
    </div>
  )
}
