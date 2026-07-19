'use client'

import type { SourceAnalysisContent } from '@/lib/lesson-content'
import { FormField, inputClasses, textareaClasses } from './form/FormField'
import { RepeatingFieldList } from './form/RepeatingFieldList'

type GuidingQuestion = SourceAnalysisContent['guidingQuestions'][number]

export function newGuidingQuestion(): GuidingQuestion {
  return {
    question: '',
    options: [
      { text: '', correct: true, feedback: '' },
      { text: '', correct: false, feedback: '' },
      { text: '', correct: false, feedback: '' },
    ],
  }
}

export function SourceAnalysisStepEditor({
  value,
  onChange,
  errors,
}: {
  value: SourceAnalysisContent
  onChange: (value: SourceAnalysisContent) => void
  errors?: Partial<Record<string, string>>
}) {
  return (
    <div className="space-y-4">
      <FormField label="Source title" error={errors?.sourceTitle}>
        {(props) => (
          <input
            {...props}
            type="text"
            className={inputClasses}
            value={value.sourceTitle}
            onChange={(e) => onChange({ ...value, sourceTitle: e.target.value })}
          />
        )}
      </FormField>

      <FormField label="Source attribution" error={errors?.sourceAttribution}>
        {(props) => (
          <input
            {...props}
            type="text"
            className={inputClasses}
            value={value.sourceAttribution}
            onChange={(e) => onChange({ ...value, sourceAttribution: e.target.value })}
          />
        )}
      </FormField>

      <FormField label="Passage" error={errors?.passage}>
        {(props) => (
          <textarea
            {...props}
            className={`${textareaClasses} min-h-[10rem]`}
            value={value.passage}
            onChange={(e) => onChange({ ...value, passage: e.target.value })}
          />
        )}
      </FormField>

      <FormField label="Guiding questions" hint="1 to 4 questions." error={errors?.guidingQuestions}>
        {() => (
          <RepeatingFieldList
            items={value.guidingQuestions}
            onChange={(guidingQuestions) => onChange({ ...value, guidingQuestions })}
            newItem={newGuidingQuestion}
            minItems={1}
            maxItems={4}
            itemLabel="Question"
            renderItem={(gq, qi, updateGq) => (
              <div className="space-y-2">
                <input
                  type="text"
                  className={inputClasses}
                  placeholder="Question text"
                  value={gq.question}
                  onChange={(e) => updateGq({ question: e.target.value })}
                />
                <div className="space-y-1.5 pl-2" role="group" aria-label={`Options for question ${qi + 1}`}>
                  {gq.options.map((opt, oi) => (
                    <div key={oi} className="flex items-start gap-2">
                      <input
                        type="radio"
                        name={`gq-${qi}-correct`}
                        checked={opt.correct}
                        onChange={() =>
                          updateGq({
                            options: gq.options.map((o, idx) => ({ ...o, correct: idx === oi })),
                          })
                        }
                        className="mt-2"
                        aria-label={`Option ${oi + 1} is correct`}
                      />
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          className={inputClasses}
                          placeholder={`Option ${oi + 1}`}
                          value={opt.text}
                          onChange={(e) =>
                            updateGq({
                              options: gq.options.map((o, idx) =>
                                idx === oi ? { ...o, text: e.target.value } : o
                              ),
                            })
                          }
                        />
                        <input
                          type="text"
                          className={inputClasses}
                          placeholder="Feedback"
                          value={opt.feedback}
                          onChange={(e) =>
                            updateGq({
                              options: gq.options.map((o, idx) =>
                                idx === oi ? { ...o, feedback: e.target.value } : o
                              ),
                            })
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          />
        )}
      </FormField>
    </div>
  )
}
