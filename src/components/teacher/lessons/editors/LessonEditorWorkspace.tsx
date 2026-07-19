'use client'

/**
 * Top-level lesson content editing workspace — one implementation shared by
 * both the teacher (/teacher/lessons/[code]/edit, class-scoped override
 * only) and admin (/admin/lessons/[code], global edit + structure) surfaces,
 * parameterized by `capabilities`. An accordion (one step open at a time)
 * keeps the ordered step list visible around whichever row is being edited;
 * the open row splits into the edit form and a live preview using the real
 * student-facing LessonStepRenderer.
 */

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LessonStepRenderer } from '@/components/student/mission/LessonStepRenderer'
import type { GlossaryTerm } from '@/lib/reading-load'
import { StepContentEditor, type SaveResult } from './StepContentEditor'
import { ScopeSwitcher, type ScopeClassOption } from './ScopeSwitcher'

export interface WorkspaceStep {
  id: string
  stepType: string
  title: string
  content: string
  sequenceOrder: number
  required: boolean
  enabled: boolean
}

export interface WorkspaceClassOverride {
  classId: string
  lessonStepId: string
  overrideTitle: string | null
  overrideContent: string | null
}

export interface WorkspaceCapabilities {
  role: 'admin' | 'teacher'
  canEditGlobal: boolean
  canAddRemoveReorder: boolean
  classes: { id: string; name: string; period: string | null }[]
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

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: 'Please sign in again.',
  FORBIDDEN: 'You do not own that class.',
  NOT_FOUND: 'Step not found — try refreshing.',
  STEP_TYPE_MISMATCH: "This step's type doesn't match — try refreshing.",
  SUB_MODE_READ_ONLY: 'Substitute mode is read-only.',
  INVALID_BODY: 'Something went wrong — try refreshing.',
}

async function postJson(url: string, body: unknown, method = 'POST'): Promise<SaveResult> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.ok) return { ok: true }
  const data = await res.json().catch(() => ({}))
  if (data.error === 'INVALID_CONTENT') {
    const fieldErrors: Record<string, string> = {}
    for (const issue of data.issues ?? []) {
      const key = issue.path?.[0]?.toString() ?? '_root'
      if (!fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { ok: false, error: 'Please fix the highlighted fields.', fieldErrors }
  }
  if (data.field && (data.error === 'NOT_FOUND' || data.error === 'UNVERIFIABLE')) {
    return {
      ok: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: {
        [data.field]:
          data.error === 'NOT_FOUND'
            ? 'This YouTube video could not be found — check the link.'
            : "Couldn't verify this video right now — try again in a moment.",
      },
    }
  }
  return { ok: false, error: ERROR_MESSAGES[data.error] ?? 'Something went wrong — try again.' }
}

export function LessonEditorWorkspace({
  lessonId,
  steps,
  overrides,
  capabilities,
  glossaryTerms,
}: {
  lessonId: string
  steps: WorkspaceStep[]
  overrides: WorkspaceClassOverride[]
  capabilities: WorkspaceCapabilities
  glossaryTerms: GlossaryTerm[]
}) {
  const router = useRouter()
  const [openStepId, setOpenStepId] = useState<string | null>(null)
  const [activeClassId, setActiveClassId] = useState<string | null>(
    capabilities.classes[0]?.id ?? null
  )
  const [previewContent, setPreviewContent] = useState<Record<string, string | null>>({})
  const [resetting, setResetting] = useState(false)
  const [addingType, setAddingType] = useState<string | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (openStepId) headingRef.current?.focus()
  }, [openStepId])

  const scopeClasses: ScopeClassOption[] = capabilities.classes.map((c) => ({
    ...c,
    hasOverride: overrides.some(
      (o) => o.classId === c.id && (o.overrideTitle !== null || o.overrideContent !== null)
    ),
  }))

  function overrideFor(stepId: string) {
    return overrides.find((o) => o.classId === activeClassId && o.lessonStepId === stepId)
  }

  async function handleResetToDefault(stepId: string) {
    if (!activeClassId) return
    setResetting(true)
    try {
      const res = await fetch('/api/teacher/lessons/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classIds: [activeClassId], lessonStepId: stepId, clear: true }),
      })
      if (res.ok) router.refresh()
    } finally {
      setResetting(false)
    }
  }

  async function handleDelete(stepId: string) {
    const check = await fetch(`/api/admin/lessons/steps/${stepId}/delete-check`)
    const { studentProgressCount } = await check.json().catch(() => ({ studentProgressCount: 0 }))
    const message =
      studentProgressCount > 0
        ? `${studentProgressCount} student${studentProgressCount === 1 ? ' has' : 's have'} their place saved at this step — deleting it will move their resume pointer. This can't be undone. Delete anyway?`
        : 'Delete this step? This can\'t be undone.'
    if (!window.confirm(message)) return
    const res = await fetch(`/api/admin/lessons/steps/${stepId}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
  }

  async function handleMove(stepId: string, direction: -1 | 1) {
    const sorted = [...steps].sort((a, b) => a.sequenceOrder - b.sequenceOrder)
    const index = sorted.findIndex((s) => s.id === stepId)
    const target = index + direction
    if (target < 0 || target >= sorted.length) return
    const orderedStepIds = sorted.map((s) => s.id)
    ;[orderedStepIds[index], orderedStepIds[target]] = [orderedStepIds[target], orderedStepIds[index]]
    const res = await fetch('/api/admin/lessons/steps/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId, orderedStepIds }),
    })
    if (res.ok) router.refresh()
  }

  const sortedSteps = [...steps].sort((a, b) => a.sequenceOrder - b.sequenceOrder)

  return (
    <div className="space-y-4">
      {capabilities.role === 'teacher' && scopeClasses.length > 0 && (
        <ScopeSwitcher
          classes={scopeClasses}
          activeClassId={activeClassId}
          onSelectClass={setActiveClassId}
          onReset={() => openStepId && handleResetToDefault(openStepId)}
          resetting={resetting}
        />
      )}

      {capabilities.canAddRemoveReorder && (
        <div className="rounded-md border border-dashed border-gray-300 p-3">
          {addingType ? (
            <AddStepForm
              lessonId={lessonId}
              stepType={addingType}
              onCancel={() => setAddingType(null)}
              onSaved={() => {
                setAddingType(null)
                router.refresh()
              }}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-semibold text-gray-600">+ Add step:</span>
              {Object.entries(TYPE_LABELS).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAddingType(type)}
                  className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <ol className="space-y-3">
        {sortedSteps.map((step) => {
          const isOpen = openStepId === step.id
          const override = overrideFor(step.id)
          const effectiveTitle =
            capabilities.role === 'teacher' ? (override?.overrideTitle ?? step.title) : step.title
          const effectiveContent =
            capabilities.role === 'teacher' ? (override?.overrideContent ?? step.content) : step.content
          const previewRaw = previewContent[step.id] ?? effectiveContent

          return (
            <li key={step.id} className="rounded-lg border border-gray-200 bg-white">
              <div className="flex flex-wrap items-center gap-2 p-3">
                <span className="text-xs font-semibold text-gray-500">Step {step.sequenceOrder}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                  {TYPE_LABELS[step.stepType] ?? step.stepType}
                </span>
                <span className="font-medium text-gray-900">{effectiveTitle}</span>
                {capabilities.canAddRemoveReorder && (
                  <span className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMove(step.id, -1)}
                      aria-label={`Move step ${step.sequenceOrder} up`}
                      className="rounded px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(step.id, 1)}
                      aria-label={`Move step ${step.sequenceOrder} down`}
                      className="rounded px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(step.id)}
                      className="rounded px-1.5 py-0.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setOpenStepId(isOpen ? null : step.id)}
                  aria-expanded={isOpen}
                  className={`rounded-md px-3 py-1 text-sm font-semibold ${
                    capabilities.canAddRemoveReorder ? '' : 'ml-auto'
                  } ${isOpen ? 'bg-gray-200 text-gray-800' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
                >
                  {isOpen ? 'Close' : 'Edit'}
                </button>
              </div>

              {isOpen && (
                <div className="border-t border-gray-200 p-4">
                  <h2 ref={headingRef} tabIndex={-1} className="sr-only">
                    Editing {TYPE_LABELS[step.stepType] ?? step.stepType} step: {effectiveTitle}
                  </h2>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <StepContentEditor
                      key={`${step.id}:${activeClassId ?? 'global'}`}
                      stepId={step.id}
                      stepType={step.stepType}
                      initialTitle={effectiveTitle}
                      initialContent={effectiveContent}
                      titleLabel="Step title"
                      saveLabel={capabilities.role === 'admin' ? 'Save for all classes' : 'Save'}
                      classOptions={capabilities.role === 'teacher' ? capabilities.classes : undefined}
                      defaultCheckedClassIds={activeClassId ? [activeClassId] : []}
                      onDraftPreviewChange={(content) =>
                        setPreviewContent((prev) => ({ ...prev, [step.id]: content }))
                      }
                      onSave={async ({ title, payload, classIds }) => {
                        if (capabilities.role === 'admin') {
                          const result = await postJson(
                            `/api/admin/lessons/steps/${step.id}`,
                            { stepType: step.stepType, title, payload },
                            'PATCH'
                          )
                          if (result.ok) router.refresh()
                          return result
                        }
                        if (!classIds || classIds.length === 0) {
                          return { ok: false, error: 'Choose at least one class first.' }
                        }
                        const result = await postJson('/api/teacher/lessons/content', {
                          classIds,
                          lessonStepId: step.id,
                          stepType: step.stepType,
                          title,
                          payload,
                        })
                        if (result.ok) router.refresh()
                        return result
                      }}
                    />
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Live preview — as:{' '}
                        {capabilities.role === 'admin'
                          ? 'global default'
                          : (scopeClasses.find((c) => c.id === activeClassId)?.name ?? '—')}
                      </p>
                      {previewRaw !== null ? (
                        <LessonStepRenderer
                          step={{
                            id: step.id,
                            stepType: step.stepType,
                            title: effectiveTitle,
                            content: previewRaw,
                            sequenceOrder: step.sequenceOrder,
                            required: step.required,
                          }}
                          glossaryTerms={glossaryTerms}
                        />
                      ) : (
                        <p className="text-sm text-gray-500">
                          Preview reflects the last valid version — fix the errors to update it.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function AddStepForm({
  lessonId,
  stepType,
  onCancel,
  onSaved,
}: {
  lessonId: string
  stepType: string
  onCancel: () => void
  onSaved: () => void
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-gray-700">
        New {TYPE_LABELS[stepType] ?? stepType} step
      </p>
      <StepContentEditor
        stepId="new"
        stepType={stepType}
        initialTitle=""
        initialContent=""
        titleLabel="Step title"
        saveLabel="Add step"
        onSave={async ({ title, payload }) => {
          const result = await postJson('/api/admin/lessons/steps', {
            lessonId,
            stepType,
            title: title || (TYPE_LABELS[stepType] ?? stepType),
            payload,
            position: 'end',
          })
          if (result.ok) onSaved()
          return result
        }}
      />
      <button
        type="button"
        onClick={onCancel}
        className="mt-2 text-sm font-medium text-gray-500 hover:underline"
      >
        Cancel
      </button>
    </div>
  )
}
