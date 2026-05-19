import { requireAuth } from '@/lib/auth'
import { AssessmentPlayer } from '@/components/student/assessment/AssessmentPlayer'

interface PageProps {
  params: { assessmentId: string }
}

export default async function AssessmentPage({ params }: PageProps) {
  await requireAuth(['STUDENT'])
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <AssessmentPlayer assessmentId={params.assessmentId} />
    </div>
  )
}
