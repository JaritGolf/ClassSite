/**
 * Lesson step visibility (ADR 0015) + per-class content overrides (ADR 0023).
 *
 * Teachers toggle lesson steps in and out of lessons at two scopes, and the
 * two scopes deliberately allow DIFFERENT step types:
 *   - global: LessonStep.enabled — site-wide, so MEDIA ONLY
 *     (VIDEO/IMAGE/DIAGRAM/INFOGRAPHIC). Enforced server-side by
 *     getStepForGlobalToggle, not just in the UI.
 *   - class:  ClassLessonStepVisibility tri-state (inherit / show / hide),
 *     roster-guarded, and since ADR 0023 accepting ANY step type — a
 *     class-scoped hide is local, reversible and never mutates shared content.
 *     Its one hard limit is assertTrainingBucketSurvives.
 *
 * The SAME ClassLessonStepVisibility row also carries an optional per-class
 * content override (overrideTitle/overrideContent, all 10 step types) — see
 * src/lib/lesson-editor/edit.ts for the write path and
 * src/lib/lesson-content/content-resolution.ts for how the independent axes
 * (visibility, content) resolve together with teacher-added modules and the
 * class's own module order.
 */

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import {
  isToggleableStepType,
  resolveClassLessonSteps,
  toClassStepViewId,
  trainingStepsOf,
} from '@/lib/lesson-content'
import type { StepOverride } from '@/lib/lesson-content'
import { assertClassOwnedByTeacher } from '@/lib/teacher-roster'
import { getClassLessonLayer } from './class-steps'

export {
  getAssessmentPreviewsForBenchmark,
  PREVIEW_ASSESSMENT_TYPES,
  type AssessmentPreview,
  type AssessmentPreviewQuestion,
  type PreviewAssessmentType,
} from './assessment-preview'

export {
  getClassLessonSteps,
  getClassLessonOutline,
  getClassLessonLayer,
} from './class-steps'

export const LESSON_MEDIA_AUDIT_ACTION = 'LESSON_MEDIA_VISIBILITY_CHANGED'

export type ClassVisibilityState = 'inherit' | 'show' | 'hide'

export class LessonMediaError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'NOT_TOGGLEABLE' | 'WOULD_EMPTY_TRAINING',
    message: string
  ) {
    super(message)
    this.name = 'LessonMediaError'
  }
}

const STEP_SELECT = {
  id: true,
  stepType: true,
  title: true,
  enabled: true,
  lessonId: true,
} as const

/**
 * A step the GLOBAL kill-switch may touch — media only.
 *
 * That flag is site-wide: flipping it changes the lesson for every class on
 * the platform, so core instruction stays off-limits there (ADR 0015).
 */
async function getStepForGlobalToggle(lessonStepId: string) {
  const step = await prisma.lessonStep.findUnique({
    where: { id: lessonStepId },
    select: STEP_SELECT,
  })
  if (!step) {
    throw new LessonMediaError('NOT_FOUND', `Lesson step ${lessonStepId} not found`)
  }
  if (!isToggleableStepType(step.stepType)) {
    throw new LessonMediaError(
      'NOT_TOGGLEABLE',
      `${step.stepType} steps are core instruction and cannot be toggled for every class`
    )
  }
  return step
}

/**
 * A step the PER-CLASS override may touch — any type (ADR 0023).
 *
 * Deliberately wider than the global gate. A class-scoped hide is local,
 * reversible, and never mutates shared content, so "I teach the source
 * analysis on paper" is a legitimate thing for a teacher to express. The one
 * thing it may not do is empty Guided Training, which
 * assertTrainingBucketSurvives enforces separately.
 */
async function getStepForClassVisibility(lessonStepId: string) {
  const step = await prisma.lessonStep.findUnique({
    where: { id: lessonStepId },
    select: STEP_SELECT,
  })
  if (!step) {
    throw new LessonMediaError('NOT_FOUND', `Lesson step ${lessonStepId} not found`)
  }
  return step
}

/** Flip the site-global enabled flag on a media step. */
export async function setGlobalStepEnabled(
  actorUserId: string,
  lessonStepId: string,
  enabled: boolean
): Promise<{ enabled: boolean }> {
  const step = await getStepForGlobalToggle(lessonStepId)

  await prisma.$transaction(async (tx) => {
    await tx.lessonStep.update({ where: { id: step.id }, data: { enabled } })
    await tx.auditLog.create({
      data: {
        actorUserId,
        action: LESSON_MEDIA_AUDIT_ACTION,
        entityType: 'LessonStep',
        entityId: step.id,
        metadataJson: {
          scope: 'global',
          lessonStepId: step.id,
          stepType: step.stepType,
          stepTitle: step.title,
          from: step.enabled,
          to: enabled,
        },
      },
    })
  })

  return { enabled }
}

/** A change a class is about to make, expressed for the floor check below. */
export type ProposedVisibilityChange =
  | { kind: 'builtin'; lessonStepId: string; visible: boolean | null }
  | { kind: 'class'; classStepId: string; visible: boolean }
  | { kind: 'delete-class'; classStepIds: readonly string[] }

/**
 * Refuse a change that would leave a class with NO visible Guided Training
 * module. A mission with an empty training bucket collapses to pre-check →
 * quiz: the student is assessed on material the app never showed them.
 *
 * The check runs the PROPOSED state through the same pure resolver and the
 * same `trainingStepsOf` predicate the student path uses, rather than
 * reimplementing "what counts as training" — the two could otherwise drift,
 * and a floor that guards the wrong set is worse than none.
 *
 * A teacher's OWN modules count toward the floor, so someone who has replaced
 * every built-in note with their own material is not blocked from hiding the
 * originals. This is the only hard stop; every other way to thin a lesson
 * (hiding all vocabulary, all source analysis) is a warning at the UI, because
 * an empty bucket renders a benign fallback rather than breaking, and a
 * teacher may legitimately run that part off-platform.
 */
export async function assertTrainingBucketSurvives(
  classId: string,
  lessonId: string,
  change: ProposedVisibilityChange
): Promise<void> {
  const [builtInSteps, overrides, layer] = await Promise.all([
    prisma.lessonStep.findMany({
      where: { lessonId },
      orderBy: { sequenceOrder: 'asc' },
      select: {
        id: true,
        stepType: true,
        title: true,
        content: true,
        sequenceOrder: true,
        required: true,
        enabled: true,
      },
    }),
    prisma.classLessonStepVisibility
      .findMany({
        where: { classId, lessonStep: { lessonId } },
        select: {
          lessonStepId: true,
          visible: true,
          overrideTitle: true,
          overrideContent: true,
        },
      })
      .then(
        (rows) =>
          new Map<string, StepOverride>(
            rows.map((r) => [
              r.lessonStepId,
              {
                visible: r.visible,
                overrideTitle: r.overrideTitle,
                overrideContent: r.overrideContent,
              },
            ])
          )
      ),
    getClassLessonLayer(classId, lessonId),
  ])

  // Apply the proposed change to the in-memory inputs before resolving.
  let classSteps = layer.classSteps
  if (change.kind === 'builtin') {
    const existing = overrides.get(change.lessonStepId)
    overrides.set(change.lessonStepId, {
      visible: change.visible,
      overrideTitle: existing?.overrideTitle ?? null,
      overrideContent: existing?.overrideContent ?? null,
    })
  } else if (change.kind === 'class') {
    const viewId = toClassStepViewId(change.classStepId)
    classSteps = classSteps.map((s) => (s.id === viewId ? { ...s, visible: change.visible } : s))
  } else {
    const removing = new Set(change.classStepIds.map(toClassStepViewId))
    classSteps = classSteps.filter((s) => !removing.has(s.id))
  }

  const resolved = resolveClassLessonSteps({
    builtInSteps,
    overrides,
    classSteps,
    savedOrder: layer.savedOrder,
  })

  if (trainingStepsOf(resolved).length === 0) {
    throw new LessonMediaError(
      'WOULD_EMPTY_TRAINING',
      'This would leave the class with no Guided Training content'
    )
  }
}

/**
 * Set (or clear, with 'inherit') a class-scoped visibility override for ANY
 * step type (ADR 0023 widened this from media-only). Caller must own the
 * class. Uses pruneOrUpdateOverrideRow so a step that ALSO carries a content
 * override for this class keeps that override when visibility is reset to
 * 'inherit' — the two axes are independent facts on the same row.
 */
export async function setClassStepVisibility(
  actorUserId: string,
  classId: string,
  lessonStepId: string,
  state: ClassVisibilityState
): Promise<{ state: ClassVisibilityState }> {
  await assertClassOwnedByTeacher(actorUserId, classId)
  const step = await getStepForClassVisibility(lessonStepId)

  if (state !== 'show') {
    await assertTrainingBucketSurvives(classId, step.lessonId, {
      kind: 'builtin',
      lessonStepId: step.id,
      visible: state === 'inherit' ? null : false,
    })
  }

  await prisma.$transaction(async (tx) => {
    const visible = state === 'inherit' ? null : state === 'show'
    await pruneOrUpdateOverrideRow(tx, classId, step.id, { visible })
    await tx.auditLog.create({
      data: {
        actorUserId,
        action: LESSON_MEDIA_AUDIT_ACTION,
        entityType: 'LessonStep',
        entityId: step.id,
        metadataJson: {
          scope: 'class',
          classId,
          lessonStepId: step.id,
          stepType: step.stepType,
          stepTitle: step.title,
          to: state,
        },
      },
    })
  })

  return { state }
}

/**
 * Class-override map (stepId → visible) for a set of steps — feeds
 * resolveVisibleSteps. Empty map when classId is null (no active class:
 * only the global flag applies). Filters visible: {not: null} since a row
 * may exist solely for a content override (visible left null) — such a row
 * carries no visibility opinion and must not leak into this Map<string,
 * boolean>.
 */
export async function getClassVisibilityMap(
  classId: string | null,
  lessonStepIds: string[]
): Promise<Map<string, boolean>> {
  if (!classId || lessonStepIds.length === 0) return new Map()
  const rows = await prisma.classLessonStepVisibility.findMany({
    where: { classId, lessonStepId: { in: lessonStepIds }, visible: { not: null } },
    select: { lessonStepId: true, visible: true },
  })
  return new Map(rows.map((r) => [r.lessonStepId, r.visible as boolean]))
}

/**
 * Class-override map (stepId → {visible, overrideTitle, overrideContent})
 * for a set of steps — feeds resolveEffectiveSteps. Empty map when classId
 * is null.
 */
export async function getClassStepOverrideMap(
  classId: string | null,
  lessonStepIds: string[]
): Promise<Map<string, StepOverride>> {
  if (!classId || lessonStepIds.length === 0) return new Map()
  const rows = await prisma.classLessonStepVisibility.findMany({
    where: { classId, lessonStepId: { in: lessonStepIds } },
    select: { lessonStepId: true, visible: true, overrideTitle: true, overrideContent: true },
  })
  return new Map(
    rows.map((r) => [
      r.lessonStepId,
      { visible: r.visible, overrideTitle: r.overrideTitle, overrideContent: r.overrideContent },
    ])
  )
}

/**
 * Decide whether a ClassLessonStepVisibility row still needs to exist after
 * a partial update, and create/update/delete it accordingly. This is the
 * single place that owns this table's "does this row still carry any
 * opinion" lifecycle rule — both the visibility toggle (above) and the
 * content-override editor (src/lib/lesson-editor/edit.ts) go through it, so
 * clearing one axis (e.g. resetting visibility to 'inherit') can never
 * silently delete an unrelated override on the other axis (e.g. a content
 * override) still present on the same row.
 */
export async function pruneOrUpdateOverrideRow(
  tx: Prisma.TransactionClient,
  classId: string,
  lessonStepId: string,
  patch: { visible?: boolean | null; overrideTitle?: string | null; overrideContent?: string | null }
): Promise<void> {
  const existing = await tx.classLessonStepVisibility.findUnique({
    where: { classId_lessonStepId: { classId, lessonStepId } },
  })
  const merged = {
    visible: existing?.visible ?? null,
    overrideTitle: existing?.overrideTitle ?? null,
    overrideContent: existing?.overrideContent ?? null,
    ...patch,
  }
  const isEmpty = merged.visible === null && merged.overrideTitle === null && merged.overrideContent === null
  if (isEmpty) {
    await tx.classLessonStepVisibility.deleteMany({ where: { classId, lessonStepId } })
  } else if (existing) {
    await tx.classLessonStepVisibility.update({
      where: { classId_lessonStepId: { classId, lessonStepId } },
      data: merged,
    })
  } else {
    await tx.classLessonStepVisibility.create({ data: { classId, lessonStepId, ...merged } })
  }
}
