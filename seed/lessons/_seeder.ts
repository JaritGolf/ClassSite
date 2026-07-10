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

    const lessonId = lessonIdFor(def.benchmarkCode)
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

    const keptIds: string[] = []
    for (let i = 0; i < def.steps.length; i++) {
      const s = def.steps[i]
      const stepId = `lstep-${codeKey(def.benchmarkCode)}-${String(i + 1).padStart(2, '0')}`
      keptIds.push(stepId)
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
        update: {
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
