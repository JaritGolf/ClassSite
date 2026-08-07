/**
 * Class-scoped lesson STRUCTURE editing — add, edit, delete and reorder the
 * modules a teacher owns for their own classes (ADR 0023).
 *
 * The class-scoped sibling of ./structure.ts, which does the same jobs
 * globally and is admin-only precisely because a global structural change
 * rewrites the lesson for every class on the platform. Everything here is
 * confined to the caller's own classes, so it is TEACHER-available:
 *   - built-in steps are never created, deleted or renumbered
 *   - teacher modules live in their own table (ClassLessonStep)
 *   - order lives in ClassLessonOutline, one row per (class, lesson)
 *
 * Callers must enforce authentication and substitute-mode themselves; the
 * roster guard is enforced HERE so every caller — routes, future code, tests —
 * is protected rather than only the one API route (the same posture
 * applyTeacherOverride adopted after the 2026-07-15 IDOR repair).
 */

import type { LessonStepType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { assertClassesOwnedByTeacher } from '@/lib/teacher-roster'
import {
  fromClassStepViewId,
  isClassStepViewId,
  reconcileClassOutline,
  toClassStepViewId,
} from '@/lib/lesson-content'
import { assertTrainingBucketSurvives, getClassLessonLayer } from '@/lib/lesson-media'
import { isEditableStepType, validateAndSerializeStepContent } from './content-schema'

export const CLASS_LESSON_STEP_ADDED = 'CLASS_LESSON_STEP_ADDED'
export const CLASS_LESSON_STEP_EDITED = 'CLASS_LESSON_STEP_EDITED'
export const CLASS_LESSON_STEP_REMOVED = 'CLASS_LESSON_STEP_REMOVED'
export const CLASS_LESSON_PLAN_REORDERED = 'CLASS_LESSON_PLAN_REORDERED'

/**
 * A runaway client loop must not be able to create thousands of rows. 25 is
 * far above any real lesson (the richest seeded lesson has 17 steps total) and
 * far below anything that would matter operationally.
 */
export const MAX_CLASS_MODULES_PER_LESSON = 25

/**
 * DISCUSSION is deliberately absent.
 *
 * It is a valid LessonStepType and both editors offer it, but `gating.ts`
 * buckets it nowhere — it renders on NO student surface — and `grep -rn
 * DISCUSSION seed/` finds zero rows, so nothing existing depends on it.
 * Offering a teacher a module type that silently shows students nothing is
 * worse than not offering it. Making it render is a content decision for a
 * separate change, not something to slip into an authoring feature.
 */
export const TEACHER_ADDABLE_STEP_TYPES = [
  'NOTE',
  'VIDEO',
  'IMAGE',
  'INTERACTIVE_CHECK',
  'VOCABULARY',
  'WORKED_EXAMPLE',
  'SOURCE_ANALYSIS',
  'DIAGRAM',
  'INFOGRAPHIC',
] as const

export type TeacherAddableStepType = (typeof TEACHER_ADDABLE_STEP_TYPES)[number]

export function isTeacherAddableStepType(stepType: string): stepType is TeacherAddableStepType {
  return (TEACHER_ADDABLE_STEP_TYPES as readonly string[]).includes(stepType)
}

export class ClassStructureError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND'
      | 'LESSON_NOT_FOUND'
      | 'ANCHOR_NOT_FOUND'
      | 'INVALID_STEP_TYPE'
      | 'STEP_TYPE_MISMATCH'
      | 'INVALID_ORDER'
      | 'PLAN_OUT_OF_DATE'
      | 'TOO_MANY_MODULES',
    message: string
  ) {
    super(message)
    this.name = 'ClassStructureError'
  }
}

/** Where a new module goes, expressed against the class's CURRENT list. */
export type ModulePlacement =
  | { position: 'start' }
  | { position: 'after'; itemId: string }

export interface AddClassModuleInput {
  classIds: readonly string[]
  lessonId: string
  stepType: string
  /** The step-list label, distinct from any `title` inside `payload`. */
  title: string
  payload?: unknown
  placement: ModulePlacement
}

/**
 * Rewrite one class's saved order, reconciling first so the write is against
 * the live step list rather than whatever stale array happened to be stored.
 */
async function persistOutline(
  tx: Prisma.TransactionClient,
  classId: string,
  lessonId: string,
  orderedItemIds: string[]
): Promise<void> {
  await tx.classLessonOutline.upsert({
    where: { classId_lessonId: { classId, lessonId } },
    create: { classId, lessonId, orderedItemIds },
    update: { orderedItemIds },
  })
}

/** The class's current effective order, reconciled against live rows. */
async function currentOrderFor(classId: string, lessonId: string): Promise<string[]> {
  const [builtInIds, layer] = await Promise.all([
    prisma.lessonStep
      .findMany({
        where: { lessonId },
        orderBy: { sequenceOrder: 'asc' },
        select: { id: true },
      })
      .then((rows) => rows.map((r) => r.id)),
    getClassLessonLayer(classId, lessonId),
  ])
  return reconcileClassOutline({
    builtInIds,
    classSteps: layer.classSteps,
    savedOrder: layer.savedOrder,
  }).order
}

/**
 * Add a module to one or more of the caller's classes.
 *
 * One request creates one row PER CLASS, all sharing a `siblingGroupId`, so a
 * later "edit this everywhere" is a lookup rather than a guess. Content is
 * validated exactly ONCE regardless of class count — a single YouTube
 * existence check, not one per class — matching setClassContentOverride.
 */
export async function addClassModule(
  actorUserId: string,
  input: AddClassModuleInput
): Promise<{ siblingGroupId: string; created: { classId: string; id: string }[] }> {
  await assertClassesOwnedByTeacher(actorUserId, input.classIds)

  if (!isTeacherAddableStepType(input.stepType) || !isEditableStepType(input.stepType)) {
    throw new ClassStructureError('INVALID_STEP_TYPE', `Unknown module type: ${input.stepType}`)
  }
  const lesson = await prisma.lesson.findUnique({
    where: { id: input.lessonId },
    select: { id: true },
  })
  if (!lesson) {
    throw new ClassStructureError('LESSON_NOT_FOUND', `Lesson ${input.lessonId} not found`)
  }

  // Validate up front so a module is only ever created with content that
  // already passes its own schema — no blank, half-written, live-to-students
  // intermediate state (the same rule addLessonStep follows).
  const content = await validateAndSerializeStepContent(input.stepType, input.payload)
  const stepType = input.stepType as LessonStepType

  for (const classId of input.classIds) {
    const count = await prisma.classLessonStep.count({
      where: { classId, lessonId: input.lessonId },
    })
    if (count >= MAX_CLASS_MODULES_PER_LESSON) {
      throw new ClassStructureError(
        'TOO_MANY_MODULES',
        `A class may hold at most ${MAX_CLASS_MODULES_PER_LESSON} of its own modules per lesson`
      )
    }
  }

  // The placement anchor is resolved per class, because each class has its own
  // order and the same built-in step can sit in different places in each.
  const orders = new Map<string, string[]>()
  for (const classId of input.classIds) {
    const order = await currentOrderFor(classId, input.lessonId)
    if (input.placement.position === 'after' && !order.includes(input.placement.itemId)) {
      throw new ClassStructureError(
        'ANCHOR_NOT_FOUND',
        `Module ${input.placement.itemId} is not in this class's lesson`
      )
    }
    orders.set(classId, order)
  }

  // A stable anchor for reconstruction if the outline is ever lost. Only a
  // BUILT-IN step can serve — anchors never chain, so a cycle is impossible.
  let anchorLessonStepId: string | null = null
  let anchorPosition: 'BEFORE' | 'AFTER' = 'AFTER'
  if (input.placement.position === 'after') {
    if (!isClassStepViewId(input.placement.itemId)) {
      anchorLessonStepId = input.placement.itemId
      anchorPosition = 'AFTER'
    } else {
      // Dropped after another teacher module: anchor to the nearest built-in
      // step before it, in any one class's order (they agree on built-ins).
      const order = orders.get(input.classIds[0]) ?? []
      const at = order.indexOf(input.placement.itemId)
      for (let i = at - 1; i >= 0; i--) {
        if (!isClassStepViewId(order[i])) {
          anchorLessonStepId = order[i]
          break
        }
      }
    }
  } else {
    const order = orders.get(input.classIds[0]) ?? []
    const firstBuiltIn = order.find((id) => !isClassStepViewId(id))
    anchorLessonStepId = firstBuiltIn ?? null
    anchorPosition = 'BEFORE'
  }

  return prisma.$transaction(async (tx) => {
    const siblingGroupId = crypto.randomUUID()
    const created: { classId: string; id: string }[] = []

    for (const classId of input.classIds) {
      const row = await tx.classLessonStep.create({
        data: {
          classId,
          lessonId: input.lessonId,
          siblingGroupId,
          stepType,
          title: input.title,
          content,
          anchorLessonStepId,
          anchorPosition,
          createdByUserId: actorUserId,
        },
        select: { id: true },
      })

      const order = [...(orders.get(classId) ?? [])]
      const viewId = toClassStepViewId(row.id)
      if (input.placement.position === 'start') {
        order.unshift(viewId)
      } else {
        order.splice(order.indexOf(input.placement.itemId) + 1, 0, viewId)
      }
      await persistOutline(tx, classId, input.lessonId, order)

      await tx.auditLog.create({
        data: {
          actorUserId,
          action: CLASS_LESSON_STEP_ADDED,
          entityType: 'ClassLessonStep',
          entityId: row.id,
          metadataJson: {
            scope: 'class',
            classId,
            lessonId: input.lessonId,
            siblingGroupId,
            stepType: input.stepType,
            title: input.title,
            contentAfter: content,
          },
        },
      })
      created.push({ classId, id: row.id })
    }

    return { siblingGroupId, created }
  })
}

export interface EditClassModuleInput {
  /** Guards a stale client submitting the wrong shape for the wrong module. */
  stepType: string
  title?: string
  payload?: unknown
  /** Apply to every class that got this module in the same "add" action. */
  applyToSiblings?: boolean
}

/** Edit a teacher module the caller owns. */
export async function editClassModule(
  actorUserId: string,
  classLessonStepId: string,
  input: EditClassModuleInput
): Promise<{ updatedCount: number }> {
  const target = await prisma.classLessonStep.findUnique({
    where: { id: classLessonStepId },
    select: { id: true, classId: true, siblingGroupId: true, stepType: true, title: true, content: true },
  })
  if (!target) {
    throw new ClassStructureError('NOT_FOUND', `Module ${classLessonStepId} not found`)
  }
  if (target.stepType !== input.stepType) {
    throw new ClassStructureError(
      'STEP_TYPE_MISMATCH',
      `Module is type ${target.stepType}, but the edit was submitted for ${input.stepType}`
    )
  }

  const rows =
    input.applyToSiblings === false
      ? [target]
      : await prisma.classLessonStep.findMany({
          where: { siblingGroupId: target.siblingGroupId },
          select: {
            id: true,
            classId: true,
            siblingGroupId: true,
            stepType: true,
            title: true,
            content: true,
          },
        })

  // Re-check EVERY sibling against the roster, not just the one addressed —
  // a siblingGroupId is not itself an authorization token.
  await assertClassesOwnedByTeacher(actorUserId, [...new Set(rows.map((r) => r.classId))])

  const content = await validateAndSerializeStepContent(target.stepType, input.payload)
  const title = input.title ?? target.title

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      await tx.classLessonStep.update({
        where: { id: row.id },
        data: { title, content },
      })
      await tx.auditLog.create({
        data: {
          actorUserId,
          action: CLASS_LESSON_STEP_EDITED,
          entityType: 'ClassLessonStep',
          entityId: row.id,
          metadataJson: {
            scope: 'class',
            classId: row.classId,
            stepType: row.stepType,
            titleBefore: row.title,
            titleAfter: title,
            contentBefore: row.content,
            contentAfter: content,
          },
        },
      })
    }
  })

  return { updatedCount: rows.length }
}

/** Delete a teacher module the caller owns (and, by default, its siblings). */
export async function deleteClassModule(
  actorUserId: string,
  classLessonStepId: string,
  opts: { applyToSiblings?: boolean } = {}
): Promise<{ deletedCount: number }> {
  const target = await prisma.classLessonStep.findUnique({
    where: { id: classLessonStepId },
    select: { id: true, classId: true, lessonId: true, siblingGroupId: true, stepType: true, title: true },
  })
  if (!target) {
    throw new ClassStructureError('NOT_FOUND', `Module ${classLessonStepId} not found`)
  }

  const rows =
    opts.applyToSiblings === false
      ? [target]
      : await prisma.classLessonStep.findMany({
          where: { siblingGroupId: target.siblingGroupId },
          select: {
            id: true,
            classId: true,
            lessonId: true,
            siblingGroupId: true,
            stepType: true,
            title: true,
          },
        })

  await assertClassesOwnedByTeacher(actorUserId, [...new Set(rows.map((r) => r.classId))])

  // Deleting a teacher module can empty Guided Training just as surely as
  // hiding the last built-in one.
  for (const row of rows) {
    await assertTrainingBucketSurvives(row.classId, row.lessonId, {
      kind: 'delete-class',
      classStepIds: [row.id],
    })
  }

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      await tx.classLessonStep.delete({ where: { id: row.id } })

      // Drop the id from the class's saved order in the same transaction, so
      // no window exists where the outline references a deleted module.
      const outline = await tx.classLessonOutline.findUnique({
        where: { classId_lessonId: { classId: row.classId, lessonId: row.lessonId } },
        select: { orderedItemIds: true },
      })
      if (outline && Array.isArray(outline.orderedItemIds)) {
        const viewId = toClassStepViewId(row.id)
        const next = (outline.orderedItemIds as unknown[]).filter(
          (id) => typeof id === 'string' && id !== viewId
        ) as string[]
        await persistOutline(tx, row.classId, row.lessonId, next)
      }

      await tx.auditLog.create({
        data: {
          actorUserId,
          action: CLASS_LESSON_STEP_REMOVED,
          entityType: 'ClassLessonStep',
          entityId: row.id,
          metadataJson: {
            scope: 'class',
            classId: row.classId,
            lessonId: row.lessonId,
            stepType: row.stepType,
            title: row.title,
          },
        },
      })
    }
  })

  return { deletedCount: rows.length }
}

export interface ReorderClassPlanInput {
  classIds: readonly string[]
  lessonId: string
  /** Must be exactly the class's current module set — see below. */
  orderedItemIds: readonly string[]
}

/**
 * Rewrite the module order for one or more classes.
 *
 * Rejects unless the submitted set matches the class's CURRENT effective set
 * exactly — no adds, drops or duplicates hiding inside a reorder (the same
 * invariant reorderLessonSteps enforces globally). A mismatch usually means
 * the plan changed under the teacher (a second tab, or a reseed that added a
 * step), which is `PLAN_OUT_OF_DATE` rather than a malformed request.
 *
 * Class modules are matched across classes by `siblingGroupId`, so one drag in
 * the UI reorders every selected period consistently even though each class
 * holds its own row ids.
 */
export async function reorderClassPlan(
  actorUserId: string,
  input: ReorderClassPlanInput
): Promise<void> {
  await assertClassesOwnedByTeacher(actorUserId, input.classIds)

  const primaryClassId = input.classIds[0]
  const primaryOrder = await currentOrderFor(primaryClassId, input.lessonId)

  const submitted = input.orderedItemIds
  const submittedSet = new Set(submitted)
  const isExactMatch =
    submitted.length === primaryOrder.length &&
    submittedSet.size === submitted.length &&
    primaryOrder.every((id) => submittedSet.has(id))
  if (!isExactMatch) {
    throw new ClassStructureError(
      'PLAN_OUT_OF_DATE',
      "The submitted order does not match this class's current modules"
    )
  }

  // One drag in the UI must reorder every selected period, but each class
  // holds its OWN row for a module added to several at once. `siblingGroupId`
  // is the join: translate the primary class's ids into each other class's.
  const rows = await prisma.classLessonStep.findMany({
    where: { lessonId: input.lessonId, classId: { in: [...input.classIds] } },
    select: { id: true, classId: true, siblingGroupId: true },
  })
  /** primary class row id → its sibling group */
  const groupOfPrimaryId = new Map(
    rows.filter((r) => r.classId === primaryClassId).map((r) => [r.id, r.siblingGroupId])
  )
  /** classId → (sibling group → that class's row id) */
  const rowByClassAndGroup = new Map<string, Map<string, string>>()
  for (const row of rows) {
    let byGroup = rowByClassAndGroup.get(row.classId)
    if (!byGroup) {
      byGroup = new Map()
      rowByClassAndGroup.set(row.classId, byGroup)
    }
    byGroup.set(row.siblingGroupId, row.id)
  }

  function translateForClass(classId: string): string[] {
    const byGroup = rowByClassAndGroup.get(classId)
    const out: string[] = []
    for (const itemId of submitted) {
      if (!isClassStepViewId(itemId)) {
        out.push(itemId) // built-in ids are shared across classes
        continue
      }
      const group = groupOfPrimaryId.get(fromClassStepViewId(itemId))
      const mapped = group ? byGroup?.get(group) : undefined
      // A module the primary class has and this one doesn't simply has no
      // position here — dropped from the translation, never invented.
      if (mapped) out.push(toClassStepViewId(mapped))
    }
    return out
  }

  await prisma.$transaction(async (tx) => {
    for (const classId of input.classIds) {
      let order: string[]
      if (classId === primaryClassId) {
        order = [...submitted]
      } else {
        const translated = translateForClass(classId)
        // Anything this class holds that the primary class doesn't (a module
        // added to one period only) keeps its place rather than being dropped.
        const known = new Set(translated)
        const existing = await currentOrderFor(classId, input.lessonId)
        order = translated.concat(existing.filter((id) => !known.has(id)))
      }
      await persistOutline(tx, classId, input.lessonId, order)
    }

    await tx.auditLog.create({
      data: {
        actorUserId,
        action: CLASS_LESSON_PLAN_REORDERED,
        entityType: 'Lesson',
        entityId: input.lessonId,
        metadataJson: {
          scope: 'class',
          classIds: [...input.classIds],
          before: primaryOrder,
          after: [...submitted],
        },
      },
    })
  })
}

/**
 * Drop a class's saved order so it returns to the curriculum's own sequence.
 *
 * Teacher modules are NOT deleted — reconciliation re-splices them at their
 * anchors, which is what lets the confirmation promise "modules you added stay
 * where they are".
 */
export async function resetClassPlanOrder(
  actorUserId: string,
  classIds: readonly string[],
  lessonId: string
): Promise<{ resetCount: number }> {
  await assertClassesOwnedByTeacher(actorUserId, classIds)

  return prisma.$transaction(async (tx) => {
    const { count } = await tx.classLessonOutline.deleteMany({
      where: { classId: { in: [...classIds] }, lessonId },
    })
    await tx.auditLog.create({
      data: {
        actorUserId,
        action: CLASS_LESSON_PLAN_REORDERED,
        entityType: 'Lesson',
        entityId: lessonId,
        metadataJson: { scope: 'class', classIds: [...classIds], reset: true },
      },
    })
    return { resetCount: count }
  })
}

/** Show or hide a teacher's own module for their class. */
export async function setClassModuleVisibility(
  actorUserId: string,
  classLessonStepId: string,
  visible: boolean,
  opts: { applyToSiblings?: boolean } = {}
): Promise<{ updatedCount: number }> {
  const target = await prisma.classLessonStep.findUnique({
    where: { id: classLessonStepId },
    select: { id: true, classId: true, lessonId: true, siblingGroupId: true, stepType: true, title: true },
  })
  if (!target) {
    throw new ClassStructureError('NOT_FOUND', `Module ${classLessonStepId} not found`)
  }

  const rows =
    opts.applyToSiblings === false
      ? [target]
      : await prisma.classLessonStep.findMany({
          where: { siblingGroupId: target.siblingGroupId },
          select: {
            id: true,
            classId: true,
            lessonId: true,
            siblingGroupId: true,
            stepType: true,
            title: true,
          },
        })

  await assertClassesOwnedByTeacher(actorUserId, [...new Set(rows.map((r) => r.classId))])

  if (!visible) {
    for (const row of rows) {
      await assertTrainingBucketSurvives(row.classId, row.lessonId, {
        kind: 'class',
        classStepId: row.id,
        visible: false,
      })
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      await tx.classLessonStep.update({ where: { id: row.id }, data: { visible } })
      await tx.auditLog.create({
        data: {
          actorUserId,
          action: CLASS_LESSON_STEP_EDITED,
          entityType: 'ClassLessonStep',
          entityId: row.id,
          metadataJson: {
            scope: 'class',
            classId: row.classId,
            stepType: row.stepType,
            title: row.title,
            visibleAfter: visible,
          },
        },
      })
    }
  })

  return { updatedCount: rows.length }
}
