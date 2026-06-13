import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { buildGlossaryAnnotations, getStudentAccommodations, type GlossaryTerm } from '@/lib/reading-load'
import { resolveL1Language, getGlossaryTermsForBenchmark } from '@/lib/l1-glosses'
import { StimulusDisplay } from '@/components/reading-load/StimulusDisplay'

interface PageProps {
  params: { id: string }
}

export default async function SourceLabPage({ params }: PageProps) {
  const session = await requireAuth(['STUDENT'])

  const stimulus = await prisma.stimulus.findUnique({
    where: { id: params.id },
    select: { id: true, title: true, content: true, readingLoadLevel: true },
  })
  if (!stimulus) notFound()

  // Pull Tier 2/3 terms for the benchmark this stimulus is used in (via any
  // question that references it), with the student's approved L1 gloss attached.
  const [linkedQuestion, student] = await Promise.all([
    prisma.question.findFirst({ where: { stimulusId: stimulus.id }, select: { benchmarkId: true } }),
    prisma.student.findUnique({ where: { userId: session.user.userId }, select: { id: true, l1Language: true } }),
  ])

  let glossaryTerms: GlossaryTerm[] = []
  if (linkedQuestion) {
    let languageCode: string | null = null
    if (student) {
      const accommodations = await getStudentAccommodations(student.id)
      const activeCodes = accommodations.filter((a) => a.active).map((a) => a.code)
      languageCode = resolveL1Language(student.l1Language ?? null, activeCodes)
    }
    glossaryTerms = await getGlossaryTermsForBenchmark(linkedQuestion.benchmarkId, languageCode)
  }

  const resolvedLevel = stimulus.readingLoadLevel
  const glossaryAnnotations = buildGlossaryAnnotations(stimulus.content, glossaryTerms, resolvedLevel)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-4">
      <h1 className="text-sm font-medium text-gray-500">Primary Source Quest</h1>
      <StimulusDisplay
        stimulusId={stimulus.id}
        title={stimulus.title}
        content={stimulus.content}
        resolvedLevel={resolvedLevel}
        fromVariant={false}
        glossaryAnnotations={glossaryAnnotations}
      />
    </div>
  )
}
