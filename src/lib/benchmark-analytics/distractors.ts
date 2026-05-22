/**
 * Distractor analysis — which wrong options are selected most, and which
 * misconceptions they map to.
 */

import { prisma } from '@/lib/db'
import { resolveTeacherId, getTeacherRoster } from '@/lib/teacher-roster'

export interface DistractorRow {
  optionId: string
  optionPreview: string
  selectedCount: number
  misconceptionCode: string | null
  misconceptionLabel: string | null
}

export async function getDistractorsByMisconception(
  teacherUserId: string,
  benchmarkId: string
): Promise<DistractorRow[]> {
  await resolveTeacherId(teacherUserId)
  const roster = await getTeacherRoster(teacherUserId)
  if (roster.allStudentIds.length === 0) return []

  // Pull incorrect responses for questions in this benchmark
  const responses = await prisma.attemptResponse.findMany({
    where: {
      isCorrect: false,
      attempt: {
        studentId: { in: roster.allStudentIds },
        voided: false,
      },
      question: { benchmarkId },
      selectedOptionId: { not: null },
    },
    select: {
      selectedOptionId: true,
      selectedOption: {
        select: {
          optionText: true,
          misconceptionId: true,
          misconception: {
            select: { code: true, label: true },
          },
        },
      },
    },
  })

  const byOption = new Map<
    string,
    {
      optionPreview: string
      selectedCount: number
      misconceptionCode: string | null
      misconceptionLabel: string | null
    }
  >()

  for (const r of responses) {
    const optionId = r.selectedOptionId
    if (!optionId || !r.selectedOption) continue

    const entry = byOption.get(optionId) ?? {
      optionPreview: r.selectedOption.optionText.slice(0, 100),
      selectedCount: 0,
      misconceptionCode: r.selectedOption.misconception?.code ?? null,
      misconceptionLabel: r.selectedOption.misconception?.label ?? null,
    }
    entry.selectedCount++
    byOption.set(optionId, entry)
  }

  return Array.from(byOption.entries())
    .map(([optionId, agg]) => ({
      optionId,
      optionPreview: agg.optionPreview,
      selectedCount: agg.selectedCount,
      misconceptionCode: agg.misconceptionCode,
      misconceptionLabel: agg.misconceptionLabel,
    }))
    .sort((a, b) => b.selectedCount - a.selectedCount)
}
