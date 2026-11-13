import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { buildGlossaryAnnotations, type GlossaryTerm } from '@/lib/reading-load'
import { getGlossaryTermsForBenchmark } from '@/lib/l1-glosses'
import { StimulusDisplay } from '@/components/reading-load/StimulusDisplay'

interface PageProps {
  params: { id: string }
}

/** A single approved primary source, the same for every visitor. */
export default async function SourceLabPage({ params }: PageProps) {
  const stimulus = await prisma.stimulus.findFirst({
    where: { id: params.id, approvalStatus: 'APPROVED' },
    select: { id: true, title: true, content: true, readingLoadLevel: true, mediaUrl: true },
  })
  if (!stimulus) notFound()

  const linkedQuestion = await prisma.question.findFirst({
    where: { stimulusId: stimulus.id },
    select: { benchmarkId: true },
  })
  const glossaryTerms: GlossaryTerm[] = linkedQuestion
    ? await getGlossaryTermsForBenchmark(linkedQuestion.benchmarkId)
    : []

  const resolvedLevel = stimulus.readingLoadLevel

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <h1 className="text-sm font-medium text-gray-600">Primary Source Quest</h1>
      <StimulusDisplay
        stimulusId={stimulus.id}
        title={stimulus.title}
        content={stimulus.content}
        resolvedLevel={resolvedLevel}
        fromVariant={false}
        glossaryAnnotations={buildGlossaryAnnotations(stimulus.content, glossaryTerms, resolvedLevel)}
        mediaUrl={stimulus.mediaUrl}
      />
    </div>
  )
}
