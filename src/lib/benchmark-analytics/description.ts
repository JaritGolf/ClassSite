/**
 * Benchmark description — the standard's own content (not roster-scoped
 * analytics). Lets a teacher understand what the benchmark requires from
 * the detail page alone: the verbatim official statement, the authored
 * lesson summary, ordered clarification bullets, and curriculum context.
 */

import { prisma } from '@/lib/db'

export interface BenchmarkDescription {
  benchmarkId: string
  benchmarkCode: string
  title: string
  officialStatement: string | null
  lessonSummary: string | null
  clarifications: string[]
  reportingCategoryName: string
  reportingCategoryDescription: string | null
  unitTitle: string
  unitDescription: string | null
}

export async function getBenchmarkDescription(
  benchmarkId: string
): Promise<BenchmarkDescription> {
  const benchmark = await prisma.benchmark.findUniqueOrThrow({
    where: { id: benchmarkId },
    select: {
      id: true,
      code: true,
      title: true,
      officialStatement: true,
      lessonSummary: true,
      reportingCategory: { select: { name: true, description: true } },
      unit: { select: { title: true, description: true } },
      clarifications: {
        orderBy: { sequenceOrder: 'asc' },
        select: { text: true },
      },
    },
  })

  return {
    benchmarkId: benchmark.id,
    benchmarkCode: benchmark.code,
    title: benchmark.title,
    officialStatement: benchmark.officialStatement,
    lessonSummary: benchmark.lessonSummary,
    clarifications: benchmark.clarifications.map((c) => c.text),
    reportingCategoryName: benchmark.reportingCategory.name,
    reportingCategoryDescription: benchmark.reportingCategory.description,
    unitTitle: benchmark.unit.title,
    unitDescription: benchmark.unit.description,
  }
}
