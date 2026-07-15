/**
 * Most-missed questions and common misconceptions across the class.
 */

import { prisma } from '@/lib/db'
import { getTeacherRoster } from '@/lib/teacher-roster'

export interface MissedQuestionRow {
  questionId: string
  benchmarkCode: string
  promptPreview: string
  missCount: number
  totalAttempts: number
  missRatePercent: number
}

export async function getMostMissedQuestions(
  teacherUserId: string,
  limit = 10
): Promise<MissedQuestionRow[]> {
  const roster = await getTeacherRoster(teacherUserId)
  if (roster.allStudentIds.length === 0) return []

  // Pull attempt responses for students in the roster.
  // Exclude voided attempts — a teacher voids a bad attempt precisely so it
  // stops counting; its responses must not inflate miss rates.
  const responses = await prisma.attemptResponse.findMany({
    where: {
      attempt: { studentId: { in: roster.allStudentIds }, voided: false },
    },
    select: {
      questionId: true,
      isCorrect: true,
      question: {
        select: {
          prompt: true,
          benchmark: { select: { code: true } },
        },
      },
    },
  })

  const byQuestion = new Map<
    string,
    {
      benchmarkCode: string
      promptPreview: string
      total: number
      missed: number
    }
  >()

  for (const r of responses) {
    const entry = byQuestion.get(r.questionId) ?? {
      benchmarkCode: r.question.benchmark.code,
      promptPreview: r.question.prompt.slice(0, 120),
      total: 0,
      missed: 0,
    }
    entry.total++
    if (!r.isCorrect) entry.missed++
    byQuestion.set(r.questionId, entry)
  }

  return Array.from(byQuestion.entries())
    .map(([questionId, agg]) => ({
      questionId,
      benchmarkCode: agg.benchmarkCode,
      promptPreview: agg.promptPreview,
      missCount: agg.missed,
      totalAttempts: agg.total,
      missRatePercent:
        agg.total === 0 ? 0 : Math.round((agg.missed / agg.total) * 100),
    }))
    .sort((a, b) => b.missCount - a.missCount)
    .slice(0, limit)
}

export interface MisconceptionRow {
  misconceptionId: string
  code: string
  label: string
  triggerCount: number
  affectedStudentCount: number
}

export async function getCommonMisconceptions(
  teacherUserId: string,
  limit = 10
): Promise<MisconceptionRow[]> {
  const roster = await getTeacherRoster(teacherUserId)
  if (roster.allStudentIds.length === 0) return []

  // Pull incorrect responses where the selected option has a misconception.
  // Exclude voided attempts (see getMostMissedQuestions).
  const responses = await prisma.attemptResponse.findMany({
    where: {
      isCorrect: false,
      attempt: { studentId: { in: roster.allStudentIds }, voided: false },
      selectedOption: { misconceptionId: { not: null } },
    },
    select: {
      attempt: { select: { studentId: true } },
      selectedOption: {
        select: {
          misconceptionId: true,
          misconception: {
            select: { code: true, label: true },
          },
        },
      },
    },
  })

  const byMisconception = new Map<
    string,
    {
      code: string
      label: string
      triggerCount: number
      affectedStudents: Set<string>
    }
  >()

  for (const r of responses) {
    const mcId = r.selectedOption?.misconceptionId
    const mc = r.selectedOption?.misconception
    if (!mcId || !mc) continue

    const entry = byMisconception.get(mcId) ?? {
      code: mc.code,
      label: mc.label,
      triggerCount: 0,
      affectedStudents: new Set<string>(),
    }
    entry.triggerCount++
    entry.affectedStudents.add(r.attempt.studentId)
    byMisconception.set(mcId, entry)
  }

  return Array.from(byMisconception.entries())
    .map(([misconceptionId, agg]) => ({
      misconceptionId,
      code: agg.code,
      label: agg.label,
      triggerCount: agg.triggerCount,
      affectedStudentCount: agg.affectedStudents.size,
    }))
    .sort((a, b) => b.triggerCount - a.triggerCount)
    .slice(0, limit)
}
