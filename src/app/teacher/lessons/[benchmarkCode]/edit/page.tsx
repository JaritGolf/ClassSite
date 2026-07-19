import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getTeacherRoster } from '@/lib/teacher-roster'
import { getGlossaryTermsForBenchmark } from '@/lib/l1-glosses'
import { LessonEditorWorkspace } from '@/components/teacher/lessons/editors/LessonEditorWorkspace'

interface PageProps {
  params: { benchmarkCode: string }
}

/**
 * /teacher/lessons/[benchmarkCode]/edit
 *
 * Teacher content editor: override any step's content for one of the
 * teacher's own classes — the global default and other classes are
 * untouched. Teacher-only (inherited from src/app/teacher/layout.tsx);
 * admins use /admin/lessons/[benchmarkCode] instead (that layout gates
 * TEACHER-only, so an admin session cannot reach this page).
 */
export default async function TeacherLessonEditPage({ params }: PageProps) {
  const session = await requireAuth(['TEACHER'])
  const roster = await getTeacherRoster(session.user.userId)

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

  const classIds = roster.classes.map((c) => c.id)
  const overrideRows = classIds.length
    ? await prisma.classLessonStepVisibility.findMany({
        where: { classId: { in: classIds }, lessonStepId: { in: lesson.steps.map((s) => s.id) } },
        select: { classId: true, lessonStepId: true, overrideTitle: true, overrideContent: true },
      })
    : []

  const glossaryTerms = await getGlossaryTermsForBenchmark(benchmark.id, null)

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/teacher/lessons/${benchmark.code}`} className="text-sm text-indigo-600 hover:underline">
          ← Back to preview
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          {benchmark.code} — {lesson.title}
        </h1>
        <p className="mt-1 max-w-prose text-sm text-gray-600">
          Swap in different content for one of your classes. Changes here only affect the class
          you have selected — the global default and your other classes are untouched.
        </p>
      </div>

      {roster.classes.length === 0 ? (
        <p className="text-sm text-gray-600">You don&apos;t have any active classes yet.</p>
      ) : (
        <LessonEditorWorkspace
          lessonId={lesson.id}
          steps={lesson.steps.map((s) => ({
            id: s.id,
            stepType: s.stepType,
            title: s.title,
            content: s.content,
            sequenceOrder: s.sequenceOrder,
            required: s.required,
            enabled: s.enabled,
          }))}
          overrides={overrideRows}
          capabilities={{
            role: 'teacher',
            canEditGlobal: false,
            canAddRemoveReorder: false,
            classes: roster.classes.map((c) => ({ id: c.id, name: c.name, period: c.period })),
          }}
          glossaryTerms={glossaryTerms}
        />
      )}
    </div>
  )
}
