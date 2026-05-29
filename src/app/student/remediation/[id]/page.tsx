import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { RemediationActivity } from '@/components/student/remediation/RemediationActivity'

interface PageProps {
  params: { id: string }
}

export default async function RemediationPage({ params }: PageProps) {
  const session = await requireAuth(['STUDENT'])

  const student = await prisma.student.findUnique({
    where: { userId: session.user.userId },
    select: { id: true },
  })
  if (!student) {
    return (
      <div className="p-8 text-center text-gray-500">
        Student record not found. Please contact your teacher.
      </div>
    )
  }

  const remediation = await prisma.studentRemediation.findUnique({
    where: { id: params.id },
    include: {
      remediationItem: {
        select: { title: true, remediationType: true, content: true },
      },
      student: { select: { id: true } },
    },
  })

  // 404 on missing OR not-owned (avoid leaking existence to other students)
  if (!remediation || remediation.student.id !== student.id) notFound()

  const masteryAssessment = await prisma.assessment.findFirst({
    where: {
      benchmarkId: remediation.benchmarkId,
      assessmentType: 'MASTERY_CHALLENGE',
      approvalStatus: 'APPROVED',
    },
    select: { id: true },
  })

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-4">
      <h1 className="text-sm font-medium text-gray-500">Targeted Practice</h1>
      <RemediationActivity
        studentRemediationId={remediation.id}
        title={remediation.remediationItem.title}
        remediationType={remediation.remediationItem.remediationType}
        content={remediation.remediationItem.content}
        alreadyComplete={remediation.status === 'COMPLETED'}
        reassessmentAssessmentId={masteryAssessment?.id ?? null}
      />
    </div>
  )
}
