/**
 * Lesson media visibility (ADR 0015).
 *
 * Teachers toggle MEDIA lesson steps (VIDEO/IMAGE/DIAGRAM/INFOGRAPHIC) in and
 * out of lessons at two scopes:
 *   - global: LessonStep.enabled (site-global kill-switch; audit-logged)
 *   - class:  ClassLessonStepVisibility tri-state (inherit / show / hide),
 *             roster-guarded via assertClassOwnedByTeacher
 * Core instructional steps are NOT toggleable — enforced here server-side
 * (isToggleableStepType), not just in the UI.
 */

import { prisma } from '@/lib/db'
import { isToggleableStepType } from '@/lib/lesson-content'
import { assertClassOwnedByTeacher } from '@/lib/teacher-roster'

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
 * media step. Caller must own the class.
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
    if (state === 'inherit') {
      await tx.classLessonStepVisibility.deleteMany({
        where: { classId, lessonStepId: step.id },
      })
    } else {
      const visible = state === 'show'
      await tx.classLessonStepVisibility.upsert({
        where: { classId_lessonStepId: { classId, lessonStepId: step.id } },
        create: { classId, lessonStepId: step.id, visible },
        update: { visible },
      })
    }
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
 * only the global flag applies).
 */
export async function getClassVisibilityMap(
  classId: string | null,
  lessonStepIds: string[]
): Promise<Map<string, boolean>> {
  if (!classId || lessonStepIds.length === 0) return new Map()
  const rows = await prisma.classLessonStepVisibility.findMany({
    where: { classId, lessonStepId: { in: lessonStepIds } },
    select: { lessonStepId: true, visible: true },
  })
  return new Map(rows.map((r) => [r.lessonStepId, r.visible]))
}
