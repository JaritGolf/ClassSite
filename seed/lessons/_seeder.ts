/**
 * Reusable lesson-seed engine (ADR 0013).
 *
 * One Lesson per benchmark with ordered LessonSteps. Structured step types
 * (WORKED_EXAMPLE, INTERACTIVE_CHECK, SOURCE_ANALYSIS) store JSON matching the
 * zod contracts in src/lib/lesson-content — validated by
 * tests/unit/seed/lesson-bank-shape.test.ts.
 *
 * Idempotency: Lesson/LessonStep have no natural unique key, so rows use
 * deterministic ids (`lesson-SS7CG11`, `lstep-SS7CG11-01`) and upsert by id —
 * the same pattern as seed/remediation_items.ts. Steps dropped from a def are
 * deleted; any StudentProgress.currentStepId pointing at a removed step is
 * nulled first (FK exists for the future resume feature).
 */

import type { ApprovalStatus, LessonStepType, PrismaClient } from '@prisma/client'

export interface LessonStepSeedDef {
  stepType: LessonStepType
  title: string
  /** Plain text for NOTE/VOCABULARY; JSON (lesson-content contracts) for structured types. */
  content: string
  required?: boolean // default true
}

export interface LessonSeedDef {
  benchmarkCode: string
  /**
   * Key used for the deterministic lesson/step ids (defaults to benchmarkCode).
   * Set when a lesson MOVES to a different benchmark (ADR 0017 realignment) so
   * its existing DB rows — and student resume pointers into them — survive:
   * the id stays derived from the ORIGINAL code while benchmarkId re-points.
   */
  idKey?: string
  /**
   * ADR 0017: interim content block awaiting its full build (incl. the media
   * pass). tests/unit/seed/lesson-bank-shape.test.ts exempts interim lessons
   * from the media-step requirement ONLY; all other template guarantees apply.
   */
  interim?: boolean
  title: string
  studentFriendlyTarget: string
  /** Mission Briefing text (Lesson.body). */
  body: string
  steps: LessonStepSeedDef[] // sequenceOrder = index + 1
}

const codeKey = (code: string) => code.replace(/\./g, '')

export function lessonIdFor(benchmarkCode: string): string {
  return `lesson-${codeKey(benchmarkCode)}`
}

export async function seedLessonDefs(
  prisma: PrismaClient,
  defs: LessonSeedDef[],
  opts: { approvalStatus: ApprovalStatus }
): Promise<number> {
  const benchmarks = await prisma.benchmark.findMany({ select: { id: true, code: true } })
  const bmMap = new Map(benchmarks.map((b) => [b.code, b.id]))

  for (const def of defs) {
    const benchmarkId = bmMap.get(def.benchmarkCode)
    if (!benchmarkId) {
      throw new Error(`Benchmark not found: "${def.benchmarkCode}" — run seedBenchmarks first.`)
    }

    const idKey = def.idKey ?? def.benchmarkCode
    const lessonId = lessonIdFor(idKey)
    await prisma.lesson.upsert({
      where: { id: lessonId },
      create: {
        id: lessonId,
        benchmarkId,
        title: def.title,
        body: def.body,
        studentFriendlyTarget: def.studentFriendlyTarget,
        approvalStatus: opts.approvalStatus,
        version: 1,
      },
      update: {
        benchmarkId,
        title: def.title,
        body: def.body,
        studentFriendlyTarget: def.studentFriendlyTarget,
        approvalStatus: opts.approvalStatus,
      },
    })

    // Lesson content editor guard (coarse, lesson-level): once an admin has
    // structurally touched this lesson (added/removed/reordered a step via
    // the editor), structureEditedAt is set and the seeder never creates,
    // deletes, or renumbers any of its steps again on any future run — an
    // admin-added step can't be mistaken for "dropped" and deleted, and a
    // deliberately-removed step can't be resurrected by this def still
    // listing it. This deliberately freezes the WHOLE lesson's step list,
    // not just the changed step, mirroring how `enabled` is already
    // permanently excluded from reseed today (simpler to reason about than
    // per-step tombstones, at the cost of also freezing future unrelated
    // fixes to this lesson).
    const lessonRow = await prisma.lesson.findUniqueOrThrow({
      where: { id: lessonId },
      select: { structureEditedAt: true },
    })
    if (lessonRow.structureEditedAt) continue

    // Step ids are POSITIONAL (`lstep-<code>-<n>`), so inserting/removing a
    // step mid-lesson re-maps existing ids to different content. When the step
    // count changes, resume pointers into this lesson would silently aim at
    // shifted steps — null them (display-only; students fall back to the
    // default start). Per-class visibility rows carry the same positional
    // caveat (ADR 0015) but are teacher-set, so they are left alone.
    const existingCount = await prisma.lessonStep.count({ where: { lessonId } })
    if (existingCount !== 0 && existingCount !== def.steps.length) {
      await prisma.studentProgress.updateMany({
        where: { currentStep: { lessonId } },
        data: { currentStepId: null },
      })
    }

    // Lesson content editor guard (fine-grained, per-step): a step an admin
    // has hand-edited (contentEditedAt set) keeps its edited title/content/
    // stepType forever — only its sequenceOrder/required still track the
    // def, so OTHER, un-edited steps in the same lesson can still pick up a
    // legitimate future seed-source fix.
    const editedStepIds = new Set(
      (
        await prisma.lessonStep.findMany({
          where: { lessonId, contentEditedAt: { not: null } },
          select: { id: true },
        })
      ).map((s) => s.id)
    )

    const keptIds: string[] = []
    for (let i = 0; i < def.steps.length; i++) {
      const s = def.steps[i]
      const stepId = `lstep-${codeKey(idKey)}-${String(i + 1).padStart(2, '0')}`
      keptIds.push(stepId)
      const isEdited = editedStepIds.has(stepId)
      await prisma.lessonStep.upsert({
        where: { id: stepId },
        create: {
          id: stepId,
          lessonId,
          stepType: s.stepType,
          title: s.title,
          content: s.content,
          sequenceOrder: i + 1,
          required: s.required ?? true,
        },
        update: isEdited
          ? { sequenceOrder: i + 1, required: s.required ?? true }
          : {
              stepType: s.stepType,
              title: s.title,
              content: s.content,
              sequenceOrder: i + 1,
              required: s.required ?? true,
            },
      })
    }

    // Remove steps dropped from the def (unreference from progress rows first).
    await prisma.studentProgress.updateMany({
      where: { currentStep: { lessonId }, currentStepId: { notIn: keptIds } },
      data: { currentStepId: null },
    })
    await prisma.lessonStep.deleteMany({ where: { lessonId, id: { notIn: keptIds } } })
  }

  return defs.length
}
