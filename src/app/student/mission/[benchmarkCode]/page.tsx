import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getStudentAccommodations } from '@/lib/reading-load'
import { resolveL1Language, getGlossaryTermsForBenchmark } from '@/lib/l1-glosses'
import { resolveEffectiveSteps } from '@/lib/lesson-content'
import { getClassStepOverrideMap } from '@/lib/lesson-media'
import { getAttemptReviewsForStudent } from '@/lib/assessment'
import { MissionFlow } from '@/components/student/mission/MissionFlow'
import { MissionReview } from '@/components/student/mission/MissionReview'

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
        select: { id: true, assessmentType: true, title: true },
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
          select: { currentStepId: true, status: true },
        })
      : Promise.resolve(null),
  ])

  // DB-derived resume: a student who already passed the Readiness Check (or
  // mastered the benchmark) must not be dumped back into Guided Training when
  // localStorage is empty (new device / cleared storage).
  let derivedResumeStep: 'mastery-challenge' | null = null
  if (student) {
    if (progress?.status === 'MASTERED') {
      derivedResumeStep = 'mastery-challenge'
    } else {
      const passedReadiness = await prisma.assessmentAttempt.findFirst({
        where: {
          studentId: student.id,
          passed: true,
          voided: false,
          assessment: { benchmarkId: benchmark.id, assessmentType: 'READINESS_CHECK' },
        },
        select: { id: true },
      })
      if (passedReadiness) derivedResumeStep = 'mastery-challenge'
    }
  }

  const lesson = benchmark.lessons[0]

  // Teacher media visibility (ADR 0015) + per-class content overrides
  // (lesson content editor): resolve steps server-side — a class's content
  // override wins over the global default, and its visibility override wins
  // over the step's global enabled flag; the two axes are independent. First
  // ACTIVE class, same convention as strategy-track requirements.
  let visibleSteps = lesson?.steps ?? []
  if (visibleSteps.length > 0) {
    let classId: string | null = null
    if (student) {
      const enrollment = await prisma.classEnrollment.findFirst({
        where: { studentId: student.id, status: 'ACTIVE', class: { active: true } },
        orderBy: { enrolledAt: 'asc' },
        select: { classId: true },
      })
      classId = enrollment?.classId ?? null
    }
    const overrides = await getClassStepOverrideMap(
      classId,
      visibleSteps.map((s) => s.id)
    )
    visibleSteps = resolveEffectiveSteps(visibleSteps, overrides)
  }

  const idForType = (t: string) =>
    benchmark.assessments.find((a) => a.assessmentType === t)?.id ?? null

  // Mastery form rotation: forms A/B/… are served round-robin by the number of
  // submitted mastery attempts, so a retry gets different questions instead of
  // the identical 5 (memorize-by-elimination defense). Off-ramp counting is by
  // benchmark + type, so attempts aggregate correctly across forms.
  const masteryForms = benchmark.assessments
    .filter((a) => a.assessmentType === 'MASTERY_CHALLENGE')
    .sort((a, b) => a.title.localeCompare(b.title))
  let masteryAssessmentId: string | null = masteryForms[0]?.id ?? null
  if (student && masteryForms.length > 1) {
    const submittedMasteryAttempts = await prisma.assessmentAttempt.count({
      where: {
        studentId: student.id,
        voided: false,
        submittedAt: { not: null },
        assessment: { benchmarkId: benchmark.id, assessmentType: 'MASTERY_CHALLENGE' },
      },
    })
    masteryAssessmentId = masteryForms[submittedMasteryAttempts % masteryForms.length].id
  }

  // Mastered missions are revisitable: full lesson content stays readable, and
  // every assessment step is replaced with a review of the student's own past
  // attempts (all rotating forms) — right/wrong per question, answer key
  // withheld so results can't be shared to cheat.
  const isMastered = student != null && progress?.status === 'MASTERED'
  const attemptReviews = isMastered
    ? await (async () => {
        const [preCheck, vocabCheck, readinessCheck, masteryChallenge] = await Promise.all([
          getAttemptReviewsForStudent({
            studentId: student!.id,
            benchmarkId: benchmark.id,
            assessmentType: 'PRE_CHECK',
          }),
          getAttemptReviewsForStudent({
            studentId: student!.id,
            benchmarkId: benchmark.id,
            assessmentType: 'VOCAB_CHECK',
          }),
          getAttemptReviewsForStudent({
            studentId: student!.id,
            benchmarkId: benchmark.id,
            assessmentType: 'READINESS_CHECK',
          }),
          getAttemptReviewsForStudent({
            studentId: student!.id,
            benchmarkId: benchmark.id,
            assessmentType: 'MASTERY_CHALLENGE',
          }),
        ])
        return { preCheck, vocabCheck, readinessCheck, masteryChallenge }
      })()
    : null

  const missionData = {
    benchmarkCode: benchmark.code,
    benchmarkTitle: benchmark.title,
    lessonSummary: benchmark.lessonSummary ?? null,
    lessonBody: lesson?.body ?? null,
    studentFriendlyTarget: lesson?.studentFriendlyTarget ?? benchmark.title,
    preCheckAssessmentId: idForType('PRE_CHECK'),
    readinessAssessmentId: idForType('READINESS_CHECK'),
    assessmentId: masteryAssessmentId,
    practiceAssessmentId: idForType('PRACTICE'),
    vocabCheckAssessmentId: idForType('VOCAB_CHECK'),
    lessonSteps: visibleSteps,
    glossaryTerms,
    resumeStepId: progress?.currentStepId ?? null,
    derivedResumeStep,
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
        <p className="font-mono text-xs text-gray-600">{benchmark.code}</p>
        <h1 className="font-display text-3xl font-bold text-indigo-900">{benchmark.title}</h1>
        {lesson && <p className="mt-1 text-base font-semibold text-indigo-700">{lesson.studentFriendlyTarget}</p>}
      </div>
      {attemptReviews ? (
        <MissionReview
          mission={{
            benchmarkCode: missionData.benchmarkCode,
            benchmarkTitle: missionData.benchmarkTitle,
            lessonSummary: missionData.lessonSummary,
            lessonBody: missionData.lessonBody,
            studentFriendlyTarget: missionData.studentFriendlyTarget,
            lessonSteps: missionData.lessonSteps,
            terms: missionData.terms,
            glossaryTerms: missionData.glossaryTerms,
            attemptReviews,
          }}
        />
      ) : (
        <MissionFlow mission={missionData} />
      )}
    </div>
  )
}
