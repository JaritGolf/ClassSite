import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getTeacherRoster } from '@/lib/teacher-roster'
import { getGlossaryTermsForBenchmark } from '@/lib/l1-glosses'
import { getClassLessonLayer, getClassStepOverrideMap } from '@/lib/lesson-media'
import { resolveClassLessonSteps } from '@/lib/lesson-content'
import { LessonBuilder, type BuilderModule } from '@/components/teacher/lessons/builder/LessonBuilder'

interface PageProps {
  params: { benchmarkCode: string }
}

/**
 * The Lesson Builder (ADR 0023).
 *
 * Absorbs what used to be two separate pages — the media-visibility preview
 * and the class content editor — because splitting them by capability meant
 * hiding a video and rewording it lived on different pages for the same
 * module. "Preview as a student" (the walkthrough) stays separate: it is a
 * different mode, not a fourth capability.
 *
 * Resolves every one of the teacher's classes up front, with hidden modules
 * INCLUDED (`includeHidden`), so switching the viewed class and detecting
 * divergence are client-side and instant.
 */
export default async function TeacherLessonBuilderPage({ params }: PageProps) {
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
          id: true,
          title: true,
          steps: { orderBy: { sequenceOrder: 'asc' } },
        },
      },
    },
  })
  const lesson = benchmark?.lessons[0]
  if (!benchmark || !lesson) notFound()

  const roster = await getTeacherRoster(session.user.userId)
  const builtInSteps = lesson.steps.map((s) => ({
    id: s.id,
    stepType: s.stepType,
    title: s.title,
    content: s.content,
    sequenceOrder: s.sequenceOrder,
    required: s.required,
    enabled: s.enabled,
  }))
  const builtInIds = builtInSteps.map((s) => s.id)

  const plansByClass: Record<string, BuilderModule[]> = {}
  const hasCustomOrderByClass: Record<string, boolean> = {}

  for (const cls of roster.classes) {
    const [overrides, layer] = await Promise.all([
      getClassStepOverrideMap(cls.id, builtInIds),
      getClassLessonLayer(cls.id, lesson.id),
    ])
    plansByClass[cls.id] = resolveClassLessonSteps({
      builtInSteps,
      overrides,
      classSteps: layer.classSteps,
      savedOrder: layer.savedOrder,
      // TEACHER SURFACE: keep hidden modules so "show again" can be offered.
      includeHidden: true,
    }).map((m) => ({
      id: m.id,
      origin: m.origin,
      stepType: m.stepType,
      title: m.title,
      content: m.content,
      hidden: m.hidden,
      edited: m.edited,
    }))
    hasCustomOrderByClass[cls.id] = layer.savedOrder !== null
  }

  const glossaryTerms = await getGlossaryTermsForBenchmark(benchmark.id, null)

  return (
    <div className="space-y-4">
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
            className="rounded-lg border-2 border-b-4 border-indigo-800 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 active:translate-y-[1px] active:border-b-2"
          >
            ▶ Preview as a student
          </Link>
        </div>
        <p className="mt-1 max-w-prose text-sm text-gray-600">
          This is your copy of the lesson. Anything you change here affects only the classes you
          pick — the original stays exactly as it is, and so do your other classes.
        </p>
      </div>

      <LessonBuilder
        lessonId={lesson.id}
        benchmarkCode={benchmark.code}
        lessonTitle={lesson.title}
        classes={roster.classes.map((c) => ({ id: c.id, name: c.name, period: c.period }))}
        plansByClass={plansByClass}
        hasCustomOrderByClass={hasCustomOrderByClass}
        glossaryTerms={glossaryTerms}
      />
    </div>
  )
}
