'use client'

/**
 * Teacher lesson preview (ADR 0015): renders every step at full fidelity via
 * the same LessonStepRenderer students use, with visibility controls attached
 * to media steps.
 */

import { LessonStepRenderer } from '@/components/student/mission/LessonStepRenderer'
import { isToggleableStepType } from '@/lib/lesson-content'
import type { GlossaryTerm } from '@/lib/reading-load'
import { StepVisibilityControls } from './StepVisibilityControls'

export interface PreviewStep {
  id: string
  stepType: string
  title: string
  content: string
  sequenceOrder: number
  required: boolean
  enabled: boolean
}

export interface PreviewClass {
  id: string
  name: string
  period: string | null
}

export interface ClassOverrideRow {
  classId: string
  lessonStepId: string
  visible: boolean
}

const TYPE_LABELS: Record<string, string> = {
  NOTE: 'Note',
  VOCABULARY: 'Vocabulary',
  WORKED_EXAMPLE: 'Worked example',
  INTERACTIVE_CHECK: 'Self-check',
  SOURCE_ANALYSIS: 'Source analysis',
  VIDEO: 'Video',
  IMAGE: 'Image',
  DIAGRAM: 'Diagram',
  INFOGRAPHIC: 'Infographic',
  DISCUSSION: 'Discussion',
}

export function LessonPreview({
  steps,
  classes,
  overrides,
  glossaryTerms,
}: {
  steps: PreviewStep[]
  classes: PreviewClass[]
  overrides: ClassOverrideRow[]
  glossaryTerms: GlossaryTerm[]
}) {
  return (
    <ol className="space-y-6">
      {steps.map((step) => {
        const toggleable = isToggleableStepType(step.stepType)
        const stepOverrides = overrides.filter((o) => o.lessonStepId === step.id)
        return (
          <li
            key={step.id}
            className={`rounded-lg border bg-white p-5 ${
              toggleable ? 'border-indigo-200' : 'border-gray-200'
            }`}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-gray-100 pb-3">
              <span className="text-xs font-semibold text-gray-500">
                Step {step.sequenceOrder}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  toggleable ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {TYPE_LABELS[step.stepType] ?? step.stepType}
              </span>
              <span className="font-medium text-gray-900">{step.title}</span>
              {!toggleable && (
                <span className="ml-auto text-xs text-gray-500">
                  core instruction — always shown
                </span>
              )}
            </div>

            {toggleable && (
              <StepVisibilityControls
                lessonStepId={step.id}
                enabled={step.enabled}
                classes={classes}
                overrides={stepOverrides}
              />
            )}

            <div className="mt-4">
              <LessonStepRenderer
                step={{
                  id: step.id,
                  stepType: step.stepType,
                  title: step.title,
                  content: step.content,
                  sequenceOrder: step.sequenceOrder,
                  required: step.required,
                }}
                glossaryTerms={glossaryTerms}
                revealAnswers
              />
            </div>
          </li>
        )
      })}
    </ol>
  )
}
