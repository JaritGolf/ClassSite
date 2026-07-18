import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getGlossaryTermsForBenchmark } from '@/lib/l1-glosses'
import { LessonEditorWorkspace } from '@/components/teacher/lessons/editors/LessonEditorWorkspace'

interface PageProps {
  params: { benchmarkCode: string }
}

/**
 * /admin/lessons/[benchmarkCode]
 *
 * Admin lesson content editor: global default content for any step (any
 * type), plus add/remove/reorder. Admin-only (inherited from
 * src/app/admin/layout.tsx).
 */
export default async function AdminLessonEditorPage({ params }: PageProps) {
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

  const glossaryTerms = await getGlossaryTermsForBenchmark(benchmark.id, null)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/lessons" className="text-sm text-indigo-600 hover:underline">
          ← All lessons
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          {benchmark.code} — {lesson.title}
        </h1>
        <p className="mt-1 max-w-prose text-sm text-gray-600">
          Changes here take effect immediately for every class that hasn&apos;t set its own
          override for a step.
        </p>
      </div>

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
        overrides={[]}
        capabilities={{ role: 'admin', canEditGlobal: true, canAddRemoveReorder: true, classes: [] }}
        glossaryTerms={glossaryTerms}
      />
    </div>
  )
}
