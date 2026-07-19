import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getTeacherRoster } from '@/lib/teacher-roster'
import { getGlossaryTermsForBenchmark } from '@/lib/l1-glosses'
import { LessonPreview } from '@/components/teacher/lessons/LessonPreview'

interface PageProps {
  params: { benchmarkCode: string }
}

/**
 * Full-fidelity lesson preview with media visibility controls (ADR 0015).
 * Renders every step exactly as students see it (same LessonStepRenderer);
 * media steps carry a global on/off switch + per-class inherit/show/hide.
 */
export default async function TeacherLessonPreviewPage({ params }: PageProps) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])

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
          steps: { orderBy: { sequenceOrder: 'asc' } },
        },
      },
    },
  })
  const lesson = benchmark?.lessons[0]
  if (!benchmark || !lesson) notFound()

  const roster = await getTeacherRoster(session.user.userId)
  const classIds = roster.classes.map((c) => c.id)
  const overrides = classIds.length
    ? await prisma.classLessonStepVisibility.findMany({
        where: {
          classId: { in: classIds },
          lessonStepId: { in: lesson.steps.map((s) => s.id) },
        },
        select: { classId: true, lessonStepId: true, visible: true },
      })
    : []

  const glossaryTerms = await getGlossaryTermsForBenchmark(benchmark.id, null)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/teacher/lessons" className="text-sm text-indigo-600 hover:underline">
          ← All lessons
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {benchmark.code} — {lesson.title}
          </h1>
          <Link
            href={`/teacher/lessons/${benchmark.code}/walkthrough`}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            ▶ Walk it like a student
          </Link>
        </div>
        <p className="mt-1 max-w-prose text-sm text-gray-600">
          Every step at once, answers revealed. Use the controls on media steps to switch them
          off for everyone or override them per class — or take the walkthrough to see the
          step-by-step student experience.
        </p>
      </div>

      <LessonPreview
        steps={lesson.steps.map((s) => ({
          id: s.id,
          stepType: s.stepType,
          title: s.title,
          content: s.content,
          sequenceOrder: s.sequenceOrder,
          required: s.required,
          enabled: s.enabled,
        }))}
        classes={roster.classes.map((c) => ({ id: c.id, name: c.name, period: c.period }))}
        overrides={overrides}
        glossaryTerms={glossaryTerms}
      />
    </div>
  )
}
