import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getStudentAccommodations } from '@/lib/reading-load'
import { resolveL1Language, getGlossaryTermsForBenchmark } from '@/lib/l1-glosses'
import { MissionFlow } from '@/components/student/mission/MissionFlow'

interface PageProps {
  params: { benchmarkCode: string }
}

export default async function MissionPage({ params }: PageProps) {
  const session = await requireAuth(['STUDENT'])

  const benchmark = await prisma.benchmark.findUnique({
    where: { code: params.benchmarkCode },
    include: {
      lessons: {
        // Rule #9: only pre-approved content reaches students.
        where: { approvalStatus: 'APPROVED' },
        orderBy: { version: 'desc' },
        include: {
          steps: { orderBy: { sequenceOrder: 'asc' } },
        },
        take: 1,
      },
      assessments: {
        where: {
          assessmentType: {
            in: ['PRE_CHECK', 'READINESS_CHECK', 'MASTERY_CHALLENGE', 'PRACTICE', 'VOCAB_CHECK'],
          },
          approvalStatus: 'APPROVED',
        },
        select: { id: true, assessmentType: true },
      },
    },
  })

  if (!benchmark) notFound()

  // Key Terms Unlock: the benchmark's approved tier-3 terms, with the
  // student's L1 gloss attached when one is approved and active (Phase 16).
  const student = await prisma.student.findUnique({
    where: { userId: session.user.userId },
    select: { id: true, l1Language: true },
  })
  let languageCode: string | null = null
  if (student) {
    const accommodations = await getStudentAccommodations(student.id)
    const activeCodes = accommodations.filter((a) => a.active).map((a) => a.code)
    languageCode = resolveL1Language(student.l1Language ?? null, activeCodes)
  }
  const [termRows, glossaryTerms, progress] = await Promise.all([
    prisma.term.findMany({
      where: { benchmarkId: benchmark.id, tier: 'TIER_3', approvalStatus: 'APPROVED' },
      orderBy: { term: 'asc' },
      select: {
        term: true,
        definition: true,
        relatedVocab: true,
        translations: languageCode
          ? {
              where: { languageCode, approvalStatus: 'APPROVED' },
              select: { definitionTranslated: true, languageCode: true },
            }
          : false,
      },
    }),
    // Popover annotations for lesson notes: tier-2 academic verbs (global) +
    // this benchmark's tier-3 terms, with L1 glosses (display-only).
    getGlossaryTermsForBenchmark(benchmark.id, languageCode),
    // Cross-device resume point (the dormant Phase-1 FK, now in use).
    student
      ? prisma.studentProgress.findUnique({
          where: { studentId_benchmarkId: { studentId: student.id, benchmarkId: benchmark.id } },
          select: { currentStepId: true },
        })
      : Promise.resolve(null),
  ])

  const lesson = benchmark.lessons[0]
  const idForType = (t: string) =>
    benchmark.assessments.find((a) => a.assessmentType === t)?.id ?? null

  const missionData = {
    benchmarkCode: benchmark.code,
    benchmarkTitle: benchmark.title,
    lessonSummary: benchmark.lessonSummary ?? null,
    lessonBody: lesson?.body ?? null,
    studentFriendlyTarget: lesson?.studentFriendlyTarget ?? benchmark.title,
    preCheckAssessmentId: idForType('PRE_CHECK'),
    readinessAssessmentId: idForType('READINESS_CHECK'),
    assessmentId: idForType('MASTERY_CHALLENGE'),
    practiceAssessmentId: idForType('PRACTICE'),
    vocabCheckAssessmentId: idForType('VOCAB_CHECK'),
    lessonSteps: lesson?.steps ?? [],
    glossaryTerms,
    resumeStepId: progress?.currentStepId ?? null,
    /** Scopes client-side resume state to this student on shared devices. */
    progressKey: session.user.userId,
    terms: termRows.map((t) => {
      const tr = Array.isArray(t.translations) ? t.translations[0] : undefined
      return {
        term: t.term,
        definition: t.definition,
        relatedVocab: t.relatedVocab ?? null,
        ...(tr ? { l1Definition: tr.definitionTranslated, l1Language: tr.languageCode } : {}),
      }
    }),
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <p className="text-xs font-mono text-gray-600">{benchmark.code}</p>
        <h1 className="text-2xl font-bold text-gray-900">{benchmark.title}</h1>
        {lesson && <p className="mt-1 text-sm text-indigo-700">{lesson.studentFriendlyTarget}</p>}
      </div>
      <MissionFlow mission={missionData} />
    </div>
  )
}
