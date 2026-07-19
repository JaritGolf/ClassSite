/**
 * Lesson media visibility (ADR 0015) + per-class content overrides (lesson
 * content editor).
 *
 * Teachers toggle MEDIA lesson steps (VIDEO/IMAGE/DIAGRAM/INFOGRAPHIC) in and
 * out of lessons at two scopes:
 *   - global: LessonStep.enabled (site-global kill-switch; audit-logged)
 *   - class:  ClassLessonStepVisibility tri-state (inherit / show / hide),
 *             roster-guarded via assertClassOwnedByTeacher
 * Core instructional steps are NOT toggleable — enforced here server-side
 * (isToggleableStepType), not just in the UI.
 *
 * The SAME ClassLessonStepVisibility row also carries an optional per-class
 * content override (overrideTitle/overrideContent, all 10 step types) — see
 * src/lib/lesson-editor/edit.ts for the write path and
 * src/lib/lesson-content/content-resolution.ts for how the two independent
 * axes (visibility, content) are resolved together.
 */

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { isToggleableStepType } from '@/lib/lesson-content'
import type { StepOverride } from '@/lib/lesson-content'
import { assertClassOwnedByTeacher } from '@/lib/teacher-roster'

export {
  getAssessmentPreviewsForBenchmark,
  PREVIEW_ASSESSMENT_TYPES,
  type AssessmentPreview,
  type AssessmentPreviewQuestion,
  type PreviewAssessmentType,
} from './assessment-preview'

export const LESSON_MEDIA_AUDIT_ACTION = 'LESSON_MEDIA_VISIBILITY_CHANGED'

export type ClassVisibilityState = 'inherit' | 'show' | 'hide'

export class LessonMediaError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'NOT_TOGGLEABLE',
    message: string
  ) {
    super(message)
    this.name = 'LessonMediaError'
  }
}

async function getToggleableStep(lessonStepId: string) {
  const step = await prisma.lessonStep.findUnique({
    where: { id: lessonStepId },
    select: { id: true, stepType: true, title: true, enabled: true, lessonId: true },
  })
  if (!step) {
    throw new LessonMediaError('NOT_FOUND', `Lesson step ${lessonStepId} not found`)
  }
  if (!isToggleableStepType(step.stepType)) {
    throw new LessonMediaError(
      'NOT_TOGGLEABLE',
      `${step.stepType} steps are core instruction and cannot be toggled`
    )
  }
  return step
}

/** Flip the site-global enabled flag on a media step. */
export async function setGlobalStepEnabled(
  actorUserId: string,
  lessonStepId: string,
  enabled: boolean
): Promise<{ enabled: boolean }> {
  const step = await getToggleableStep(lessonStepId)

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

/**
 * Set (or clear, with 'inherit') a class-scoped visibility override for a
 * media step. Caller must own the class. Uses pruneOrUpdateOverrideRow so a
 * step that ALSO carries a content override for this class keeps that
 * override when visibility is reset to 'inherit' — the two axes are
 * independent facts on the same row.
 */
export async function setClassStepVisibility(
  actorUserId: string,
  classId: string,
  lessonStepId: string,
  state: ClassVisibilityState
): Promise<{ state: ClassVisibilityState }> {
  await assertClassOwnedByTeacher(actorUserId, classId)
  const step = await getToggleableStep(lessonStepId)

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
