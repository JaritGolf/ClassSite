import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
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
        include: {
          steps: { orderBy: { sequenceOrder: 'asc' } },
        },
        take: 1,
      },
      assessments: {
        where: {
          assessmentType: { in: ['PRE_CHECK', 'READINESS_CHECK', 'MASTERY_CHALLENGE'] },
          approvalStatus: 'APPROVED',
        },
        select: { id: true, assessmentType: true },
      },
    },
  })

  if (!benchmark) notFound()

  const lesson = benchmark.lessons[0]
  const idForType = (t: string) =>
    benchmark.assessments.find((a) => a.assessmentType === t)?.id ?? null

  const missionData = {
    benchmarkCode: benchmark.code,
    benchmarkTitle: benchmark.title,
    lessonSummary: benchmark.lessonSummary ?? null,
    studentFriendlyTarget: lesson?.studentFriendlyTarget ?? benchmark.title,
    preCheckAssessmentId: idForType('PRE_CHECK'),
    readinessAssessmentId: idForType('READINESS_CHECK'),
    assessmentId: idForType('MASTERY_CHALLENGE'),
    lessonSteps: lesson?.steps ?? [],
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <p className="text-xs font-mono text-gray-400">{benchmark.code}</p>
        <h1 className="text-2xl font-bold text-gray-900">{benchmark.title}</h1>
      </div>
      <MissionFlow mission={missionData} />
    </div>
  )
}
