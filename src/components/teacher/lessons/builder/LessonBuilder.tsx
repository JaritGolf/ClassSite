'use client'

/**
 * The Lesson Builder — a teacher's single surface for shaping a mission for
 * their own classes (ADR 0023).
 *
 * Replaces a three-page split that was organised by CAPABILITY (visibility /
 * content / preview) rather than by anything a teacher thinks about: hiding a
 * video and rewording it were two different pages for the same module. This
 * page absorbs both; "Preview as a student" stays separate because it is a
 * different MODE (linear, gated, whole-mission), not a fourth capability.
 *
 * Kept from LessonEditorWorkspace, which remains the admin surface: the
 * accordion (one module open at a time, so the surrounding order stays
 * visible), the postJson error normalizer, and StepContentEditor with its ten
 * per-type editors. Deliberately NOT kept: the fetch-plus-router.refresh() on
 * every ▲/▼ press, which is janky, races on fast presses, and drops keyboard
 * focus.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LessonStepRenderer } from '@/components/student/mission/LessonStepRenderer'
import { TrackIcon } from '@/components/ui/TrackIcon'
import type { GlossaryTerm } from '@/lib/reading-load'
import {
  isCompositeCapableStepType,
  isToggleableStepType,
  parseStepContent,
} from '@/lib/lesson-content'
import { StepContentEditor, type SaveResult } from '../editors/StepContentEditor'
import { CompositeStepEditor } from '../editors/blocks/CompositeStepEditor'
import type { DraftValue } from '../editors/blocks/block-draft'
import { fieldErrorsFromIssues } from '../editors/blocks/field-errors'
import { BuilderAnnouncer, useAnnouncer } from './BuilderAnnouncer'
import { ClassScopeBar, classLabel, saveLabelFor, type BuilderClass } from './ClassScopeBar'
import { ConfirmInline } from './ConfirmInline'
import { ModuleInsertSlot, positionPhrase } from './ModuleInsertSlot'
import { ModuleStatusChip } from './ModuleStatusChip'
import { ModuleTypePicker } from './ModuleTypePicker'
import { blankDraftFor, moduleTypeIcon, moduleTypeLabel, type ModuleTypeKey } from './module-types'
import { MODULE_TYPES } from './module-types'

export interface BuilderModule {
  /** Built-in: raw LessonStep id. Teacher module: `cstep:<cuid>`. */
  id: string
  origin: 'BUILTIN' | 'CLASS'
  stepType: string
  title: string
  content: string
  hidden: boolean
  edited: boolean
}

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: 'You have been signed out. Sign in again in a new tab, then come back.',
  FORBIDDEN: 'You do not own that class.',
  NOT_FOUND: 'That module no longer exists — refresh the page.',
  LESSON_NOT_FOUND: 'That lesson no longer exists — refresh the page.',
  ANCHOR_NOT_FOUND: 'That spot no longer exists — refresh the page.',
  STEP_TYPE_MISMATCH: "This module's type doesn't match — refresh the page.",
  SUB_MODE_READ_ONLY:
    'You are in substitute mode, so this lesson is read-only. Turn substitute mode off in Settings.',
  INVALID_BODY: 'Something went wrong — refresh the page and try again.',
  TOO_MANY_MODULES:
    "You've added 25 of your own modules to this lesson — that's the limit. Delete one you're not using to make room.",
  WOULD_EMPTY_TRAINING:
    'This is the only teaching module left for this class. Hiding it would leave your students an empty lesson. Add something else first.',
  PLAN_OUT_OF_DATE:
    'This lesson changed while you had it open — maybe in another tab. Reload and try that again.',
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
    // Full dotted paths, not just the first segment — see the note on
    // fieldErrorsFromIssues. The server already puts complete ZodIssue paths on
    // the wire; only the client used to throw them away.
    return {
      ok: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: fieldErrorsFromIssues(data.issues ?? []),
    }
  }
  if (data.field && (data.error === 'NOT_FOUND' || data.error === 'UNVERIFIABLE')) {
    return {
      ok: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: {
        [data.field]:
          data.error === 'NOT_FOUND'
            ? 'We couldn’t find that YouTube video — check the link.'
            : 'We couldn’t reach YouTube just now. Try again in a moment.',
      },
    }
  }
  return { ok: false, error: ERROR_MESSAGES[data.error] ?? 'Something went wrong — try again.' }
}

/**
 * Route a module to the right editor.
 *
 * CONTENT modules get the composite editor, so a paragraph and the picture
 * that supports it can live in one module — and therefore on one screen, since
 * Guided Training paginates one module per screen.
 *
 * QUESTION modules (Quick check, Document study) keep the single-shape editor.
 * Content and questions are separate entities: a question is always its own
 * module, which is what keeps "does this module stop the student until they
 * answer?" answerable from outside it.
 */
function ModuleEditor(props: {
  stepId: string
  stepType: string
  initialTitle: string
  initialContent: string
  titleLabel: string
  saveLabel: string
  onSave: (input: { title?: string; payload: unknown }) => Promise<SaveResult>
  initialDraft?: DraftValue
}) {
  if (isCompositeCapableStepType(props.stepType)) {
    return <CompositeStepEditor {...props} />
  }
  return <StepContentEditor {...props} />
}

export function LessonBuilder(props: LessonBuilderProps) {
  return (
    <BuilderAnnouncer>
      <BuilderInner {...props} />
    </BuilderAnnouncer>
  )
}

interface LessonBuilderProps {
  lessonId: string
  benchmarkCode: string
  lessonTitle: string
  classes: BuilderClass[]
  /** classId → that class's full module list, hidden ones included. */
  plansByClass: Record<string, BuilderModule[]>
  glossaryTerms: GlossaryTerm[]
  /** True when the class's saved order differs from the curriculum sequence. */
  hasCustomOrderByClass: Record<string, boolean>
}

type PendingConfirm =
  | { kind: 'reset-content'; moduleId: string; title: string }
  | { kind: 'delete-module'; moduleId: string; title: string }
  | { kind: 'reset-order' }

function BuilderInner({
  lessonId,
  benchmarkCode,
  lessonTitle,
  classes,
  plansByClass,
  glossaryTerms,
  hasCustomOrderByClass,
}: LessonBuilderProps) {
  const router = useRouter()
  const { announce, announceError } = useAnnouncer()

  const [applyClassIds, setApplyClassIds] = useState<string[]>(classes.map((c) => c.id))
  const [viewingClassId, setViewingClassId] = useState<string>(classes[0]?.id ?? '')
  const [openModuleId, setOpenModuleId] = useState<string | null>(null)
  const [insertAt, setInsertAt] = useState<string | null>(null)
  const [addingType, setAddingType] = useState<{ key: ModuleTypeKey; afterId: string | null } | null>(
    null
  )
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null)
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)

  const serverModules = plansByClass[viewingClassId] ?? []
  /** Optimistic order so ▲/▼ feel instant; server catches up on a debounce. */
  const [order, setOrder] = useState<string[]>(() => serverModules.map((m) => m.id))
  const pendingFocus = useRef<string | null>(null)
  const saveOrderTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Re-sync when the server data or the viewed class changes.
  useEffect(() => {
    setOrder(serverModules.map((m) => m.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingClassId, plansByClass])

  const byId = useMemo(
    () => new Map(serverModules.map((m) => [m.id, m])),
    [serverModules]
  )
  const modules = useMemo(
    () => order.map((id) => byId.get(id)).filter((m): m is BuilderModule => Boolean(m)),
    [order, byId]
  )

  // After a move the DOM is replaced and focus would fall to <body>, stranding
  // a keyboard user. Restore it to the same button on the row that moved.
  useEffect(() => {
    if (!pendingFocus.current) return
    const el = document.getElementById(pendingFocus.current)
    pendingFocus.current = null
    el?.focus()
  }, [order])

  const persistOrder = useCallback(
    async (next: string[]) => {
      const result = await postJson(
        '/api/teacher/lessons/plan/order',
        { classIds: applyClassIds, lessonId, orderedItemIds: next },
        'PUT'
      )
      if (!result.ok) {
        announceError(result.error ?? 'The new order did not save.')
        setBanner(result.error ?? 'The new order did not save.')
        router.refresh()
        return
      }
      announce('Order saved.')
      router.refresh()
    },
    [applyClassIds, lessonId, announce, announceError, router]
  )

  function move(moduleId: string, direction: -1 | 1) {
    const index = order.indexOf(moduleId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= order.length) return

    const next = [...order]
    ;[next[index], next[target]] = [next[target], next[index]]
    setOrder(next)
    pendingFocus.current = `move-${direction === -1 ? 'up' : 'down'}-${moduleId}`
    announce(
      `“${byId.get(moduleId)?.title ?? 'Module'}” moved to position ${target + 1} of ${next.length}.`
    )

    // Debounced: one press per keystroke would otherwise fire a request each
    // time and let two fast presses race.
    if (saveOrderTimer.current) clearTimeout(saveOrderTimer.current)
    saveOrderTimer.current = setTimeout(() => void persistOrder(next), 600)
  }

  async function run(action: () => Promise<SaveResult>, successMessage: string) {
    setBusy(true)
    setBanner(null)
    try {
      const result = await action()
      if (!result.ok) {
        announceError(result.error ?? 'That did not work.')
        setBanner(result.error ?? 'That did not work.')
        return false
      }
      announce(successMessage)
      router.refresh()
      return true
    } finally {
      setBusy(false)
    }
  }

  const saveLabel = saveLabelFor(classes, applyClassIds)
  const scopeNames = classes.filter((c) => applyClassIds.includes(c.id)).map(classLabel)
  const viewingName = classes.find((c) => c.id === viewingClassId)?.name ?? 'this class'

  if (classes.length === 0) {
    return (
      <p className="text-sm text-gray-600">
        You don&apos;t have any active classes yet. Once a class is set up, you can customize this
        lesson for it.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <ClassScopeBar
        classes={classes}
        applyClassIds={applyClassIds}
        viewingClassId={viewingClassId}
        onChangeApply={(ids) => {
          setApplyClassIds(ids)
          announce(
            ids.length === classes.length
              ? `Now editing for all ${classes.length} classes.`
              : `Now editing for ${ids.length === 0 ? 'no classes' : scopeNames.join(', ')}.`
          )
        }}
        onChangeViewing={(id) => {
          setViewingClassId(id)
          setOpenModuleId(null)
        }}
      />

      {banner && (
        <p role="alert" className="rounded-md border-2 border-rose-300 bg-rose-50 p-3 text-sm font-semibold text-rose-800">
          {banner}
        </p>
      )}

      {hasCustomOrderByClass[viewingClassId] && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-600">You have rearranged this lesson.</span>
          <button
            type="button"
            onClick={() => setConfirm({ kind: 'reset-order' })}
            className="font-semibold text-indigo-700 hover:underline"
          >
            Put the modules back in the original order
          </button>
        </div>
      )}

      {confirm?.kind === 'reset-order' && (
        <ConfirmInline
          heading="Put the original order back?"
          body={`The curriculum's modules will go back where they started, for ${
            applyClassIds.length === classes.length
              ? `all ${classes.length} of your classes`
              : scopeNames.join(' and ')
          }. Modules you added stay where they are.`}
          confirmLabel="Put the order back"
          cancelLabel="Leave it"
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            setConfirm(null)
            await run(
              () =>
                postJson('/api/teacher/lessons/plan/order/reset', {
                  classIds: applyClassIds,
                  lessonId,
                }),
              'Original order put back.'
            )
          }}
        />
      )}

      <ol className="space-y-1">
        {modules.length === 0 && (
          <li className="rounded-md border-2 border-dashed border-gray-300 p-6 text-center text-sm text-gray-600">
            This mission doesn&apos;t have any modules yet. Add the first one below.
          </li>
        )}

        {renderSlot(null, modules[0]?.title ?? null, null)}

        {modules.map((mod, index) => {
          const parsed = parseStepContent(mod.stepType, mod.content)
          const isOpen = openModuleId === mod.id
          return (
            <li key={mod.id}>
              <div
                className={`rounded-lg border-2 bg-white p-3 ${
                  mod.hidden ? 'border-gray-200 opacity-60' : 'border-gray-200'
                }`}
              >
                <div className="flex flex-wrap items-start gap-2">
                  <span className="mt-0.5 text-xs font-bold text-gray-400">{index + 1}</span>
                  <TrackIcon
                    name={moduleTypeIcon(mod.stepType, parsed.kind)}
                    className="mt-0.5 h-4 w-4 shrink-0 text-gray-500"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{mod.title}</p>
                    <p className="text-xs text-gray-500">
                      {moduleTypeLabel(mod.stepType, parsed.kind)}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {mod.origin === 'CLASS' && (
                        <ModuleStatusChip status="ADDED_BY_ME" classNames={[viewingName]} />
                      )}
                      {mod.edited && <ModuleStatusChip status="EDITED" classNames={[viewingName]} />}
                      {mod.hidden && <ModuleStatusChip status="HIDDEN" classNames={[viewingName]} />}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      id={`move-up-${mod.id}`}
                      type="button"
                      disabled={index === 0 || busy}
                      onClick={() => move(mod.id, -1)}
                      aria-label={`Move “${mod.title}” up. Currently ${index + 1} of ${modules.length}.`}
                      className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      id={`move-down-${mod.id}`}
                      type="button"
                      disabled={index === modules.length - 1 || busy}
                      onClick={() => move(mod.id, 1)}
                      aria-label={`Move “${mod.title}” down. Currently ${index + 1} of ${modules.length}.`}
                      className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-30"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenModuleId(isOpen ? null : mod.id)}
                      aria-expanded={isOpen}
                      className="rounded-md border border-indigo-300 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-800"
                    >
                      {isOpen ? 'Close' : 'Edit'}
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        () =>
                          mod.origin === 'CLASS'
                            ? postJson(
                                `/api/teacher/lessons/modules/${classStepIdOf(mod.id)}`,
                                { op: 'visibility', visible: mod.hidden },
                                'PATCH'
                              )
                            : postJson('/api/teacher/lessons/visibility', {
                                scope: 'class',
                                classId: viewingClassId,
                                lessonStepId: mod.id,
                                state: mod.hidden ? 'inherit' : 'hide',
                              }),
                        mod.hidden
                          ? `“${mod.title}” is visible to students again.`
                          : `“${mod.title}” is hidden from students.`
                      )
                    }
                    className="font-semibold text-gray-700 hover:underline"
                  >
                    {mod.hidden ? 'Show again' : 'Hide from students'}
                  </button>

                  {mod.edited && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirm({ kind: 'reset-content', moduleId: mod.id, title: mod.title })}
                      className="font-semibold text-gray-700 hover:underline"
                    >
                      Reset to original
                    </button>
                  )}

                  {mod.origin === 'CLASS' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirm({ kind: 'delete-module', moduleId: mod.id, title: mod.title })}
                      className="font-semibold text-rose-700 hover:underline"
                    >
                      Delete
                    </button>
                  )}

                  {/*
                    The site-wide media kill-switch (ADR 0015). Kept reachable
                    here because this builder replaced the page that used to
                    host it — dropping it would have silently removed a
                    capability. Media types only, matching the server rule,
                    and labelled so it can't be confused with the per-class
                    hide above it.
                  */}
                  {mod.origin === 'BUILTIN' && isToggleableStepType(mod.stepType) && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () =>
                            postJson('/api/teacher/lessons/visibility', {
                              scope: 'global',
                              lessonStepId: mod.id,
                              enabled: false,
                            }),
                          `“${mod.title}” switched off for every class on this site.`
                        )
                      }
                      className="font-semibold text-gray-500 hover:underline"
                    >
                      Turn off for every class on this site
                    </button>
                  )}
                </div>

                {confirm?.kind === 'reset-content' && confirm.moduleId === mod.id && (
                  <ConfirmInline
                    heading="Put the original back?"
                    body={`${
                      applyClassIds.length === classes.length
                        ? `All ${classes.length} of your classes`
                        : scopeNames.join(' and ')
                    } will go back to the version that came with the curriculum. Anything you typed here will be gone.`}
                    confirmLabel="Put the original back"
                    cancelLabel="Keep my version"
                    destructive
                    onCancel={() => setConfirm(null)}
                    onConfirm={async () => {
                      setConfirm(null)
                      await run(
                        () =>
                          postJson('/api/teacher/lessons/content', {
                            classIds: applyClassIds,
                            lessonStepId: mod.id,
                            clear: true,
                          }),
                        `“${mod.title}” is back to the original.`
                      )
                    }}
                  />
                )}

                {confirm?.kind === 'delete-module' && confirm.moduleId === mod.id && (
                  <ConfirmInline
                    heading={`Delete “${mod.title}”?`}
                    body={`This module will be gone from ${
                      applyClassIds.length === classes.length
                        ? `all ${classes.length} of your classes`
                        : scopeNames.join(' and ')
                    }. You can't undo this.`}
                    confirmLabel="Delete it"
                    cancelLabel="Keep it"
                    destructive
                    onCancel={() => setConfirm(null)}
                    onConfirm={async () => {
                      setConfirm(null)
                      const nextIndex = Math.min(index, modules.length - 2)
                      await run(
                        () =>
                          postJson(
                            `/api/teacher/lessons/modules/${classStepIdOf(mod.id)}`,
                            {},
                            'DELETE'
                          ),
                        `“${mod.title}” deleted. ${modules.length - 1} modules left.`
                      )
                      pendingFocus.current = modules[nextIndex]
                        ? `move-up-${modules[nextIndex].id}`
                        : null
                    }}
                  />
                )}

                {isOpen && (
                  <div className="mt-3 grid gap-4 border-t border-gray-200 pt-3 lg:grid-cols-2">
                    <ModuleEditor
                      stepId={mod.id}
                      stepType={mod.stepType}
                      initialTitle={mod.title}
                      initialContent={mod.content}
                      titleLabel="Module name (what students see in the step list)"
                      saveLabel={saveLabel}
                      onSave={async ({ title, payload }) => {
                        if (applyClassIds.length === 0) {
                          return { ok: false, error: 'Pick at least one class before saving.' }
                        }
                        const result =
                          mod.origin === 'CLASS'
                            ? await postJson(
                                `/api/teacher/lessons/modules/${classStepIdOf(mod.id)}`,
                                { op: 'edit', stepType: mod.stepType, title, payload },
                                'PATCH'
                              )
                            : await postJson('/api/teacher/lessons/content', {
                                classIds: applyClassIds,
                                lessonStepId: mod.id,
                                stepType: mod.stepType,
                                title,
                                payload,
                              })
                        if (result.ok) {
                          announce(`“${title ?? mod.title}” saved.`)
                          router.refresh()
                        }
                        return result
                      }}
                    />
                    {/*
                      aria-live="off" is explicit: this re-renders on every
                      keystroke, and an implicit live region here reads the
                      whole preview aloud continuously.
                    */}
                    <div aria-live="off" className="rounded-md border border-gray-200 bg-gray-50 p-3">
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        What {viewingName} will see
                      </h3>
                      <LessonStepRenderer
                        step={{
                          id: mod.id,
                          stepType: mod.stepType,
                          title: mod.title,
                          content: mod.content,
                          sequenceOrder: index + 1,
                          required: false,
                        }}
                        glossaryTerms={glossaryTerms}
                        revealAnswers
                      />
                    </div>
                  </div>
                )}
              </div>

              {renderSlot(mod.id, modules[index + 1]?.title ?? null, mod.title)}
            </li>
          )
        })}
      </ol>
    </div>
  )

  function renderSlot(afterId: string | null, beforeLabel: string | null, afterLabel: string | null) {
    const slotKey = afterId ?? '__start__'
    const buttonId = `insert-${slotKey}`

    if (addingType && addingType.afterId === afterId) {
      const meta = MODULE_TYPES.find((m) => m.key === addingType.key)
      return (
        <div className="my-2 rounded-lg border-2 border-indigo-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            {/* Names are already sentence-shaped ("Text I write"); lowercasing
                them produced "New text i write". */}
            <h3 tabIndex={-1} className="text-sm font-bold text-gray-900 outline-none">
              New module — {meta?.name ?? 'Text I write'}
            </h3>
            <button
              type="button"
              onClick={() => setAddingType(null)}
              className="text-xs font-semibold text-indigo-700 hover:underline"
            >
              ← Choose a different type
            </button>
          </div>
          <ModuleEditor
            stepId={`new-${addingType.key}-${slotKey}`}
            stepType={meta?.stepType ?? 'NOTE'}
            initialTitle=""
            initialContent=""
            // A blank payload can never satisfy its own schema, so serializing
            // one and letting the editor parse it back always degraded to the
            // text fallback. Hand over the draft directly instead.
            initialDraft={blankDraftFor(addingType.key)}
            titleLabel="Module name (what students see in the step list)"
            saveLabel={
              applyClassIds.length === classes.length && classes.length > 1
                ? `Add to all ${classes.length} classes`
                : 'Add this module'
            }
            onSave={async ({ title, payload }) => {
              if (applyClassIds.length === 0) {
                return { ok: false, error: 'Pick at least one class before saving.' }
              }
              const result = await postJson('/api/teacher/lessons/modules', {
                classIds: applyClassIds,
                lessonId,
                stepType: meta?.stepType ?? 'NOTE',
                title: title || meta?.name || 'New module',
                payload,
                placement: afterId ? { position: 'after', itemId: afterId } : { position: 'start' },
              })
              if (result.ok) {
                announce(`“${title || meta?.name}” added.`)
                setAddingType(null)
                router.refresh()
              }
              return result
            }}
          />
        </div>
      )
    }

    if (insertAt === slotKey) {
      return (
        <ModuleTypePicker
          positionLabel={positionPhrase(afterLabel, beforeLabel)}
          onPick={(key) => {
            setInsertAt(null)
            setAddingType({ key, afterId })
          }}
          onCancel={() => {
            setInsertAt(null)
            document.getElementById(buttonId)?.focus()
          }}
        />
      )
    }

    return (
      <ModuleInsertSlot
        buttonId={buttonId}
        afterLabel={afterLabel}
        beforeLabel={beforeLabel}
        onOpen={() => setInsertAt(slotKey)}
      />
    )
  }
}

/** `cstep:<cuid>` → `<cuid>` for the module routes, which take the raw id. */
function classStepIdOf(viewId: string): string {
  return viewId.startsWith('cstep:') ? viewId.slice('cstep:'.length) : viewId
}
