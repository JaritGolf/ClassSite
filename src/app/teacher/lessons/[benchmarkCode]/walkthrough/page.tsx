import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getGlossaryTermsForBenchmark } from '@/lib/l1-glosses'
import { getAssessmentPreviewsForBenchmark } from '@/lib/lesson-media'
import { MissionWalkthrough } from '@/components/teacher/lessons/MissionWalkthrough'

interface PageProps {
  params: { benchmarkCode: string }
}

/**
 * "Walk it like a student" (ADR 0015): the student mission flow at teacher
 * speed — free navigation, revealed answers, read-only assessment previews.
 * Shows ALL lesson steps regardless of media visibility toggles (this is the
 * authoring view; per-class effective visibility lives on the manage page).
 */
export default async function TeacherWalkthroughPage({ params }: PageProps) {
  await requireAuth(['TEACHER', 'ADMIN'])

  const benchmark = await prisma.benchmark.findUnique({
    where: { code: params.benchmarkCode },
    select: {
      id: true,
      code: true,
      title: true,
      lessons: {
        where: { approvalStatus: 'APPROVED' },
        orderBy: { version: 'desc' },
        take: 1,
        select: {
          title: true,
          body: true,
          studentFriendlyTarget: true,
          steps: { orderBy: { sequenceOrder: 'asc' } },
        },
      },
      terms: {
        where: { tier: 'TIER_3', approvalStatus: 'APPROVED' },
        orderBy: { term: 'asc' },
        select: { term: true, definition: true, relatedVocab: true },
      },
    },
  })
  const lesson = benchmark?.lessons[0]
  if (!benchmark || !lesson) notFound()

  const [glossaryTerms, assessments] = await Promise.all([
    getGlossaryTermsForBenchmark(benchmark.id, null),
    getAssessmentPreviewsForBenchmark(benchmark.id),
  ])

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={`/teacher/lessons/${benchmark.code}`}
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Back to editing
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          {benchmark.code} — {lesson.title}
        </h1>
      </div>

      <MissionWalkthrough
        data={{
          benchmarkCode: benchmark.code,
          benchmarkTitle: benchmark.title,
          lessonTitle: lesson.title,
          lessonBody: lesson.body,
          studentFriendlyTarget: lesson.studentFriendlyTarget,
          lessonSteps: lesson.steps.map((s) => ({
            id: s.id,
            stepType: s.stepType,
            title: s.title,
            content: s.content,
            sequenceOrder: s.sequenceOrder,
            required: s.required,
          })),
          terms: benchmark.terms.map((t) => ({
            term: t.term,
            definition: t.definition,
            relatedVocab: t.relatedVocab ?? null,
          })),
          glossaryTerms,
          assessments,
        }}
      />
    </div>
  )
}
