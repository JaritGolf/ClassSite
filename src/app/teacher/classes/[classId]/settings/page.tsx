import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { assertClassOwnedByTeacher, RosterError } from '@/lib/teacher-roster'
import { prisma } from '@/lib/db'
import { RcClassSettingsForm } from '@/components/teacher/RcClassSettingsForm'
import { StaminaLadderPreview } from '@/components/teacher/StaminaLadderPreview'

export default async function ClassSettingsPage({
  params,
}: {
  params: { classId: string }
}) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])

  try {
    await assertClassOwnedByTeacher(session.user.userId, params.classId)
  } catch (e) {
    if (e instanceof RosterError) notFound()
    throw e
  }

  const klass = await prisma.class.findUnique({
    where: { id: params.classId },
    select: {
      id: true,
      name: true,
      rcSessionLengthOverride: true,
      rcAttemptsAllowed: true,
      rcReviewWindow: true,
      rcStaminaOverride: true,
      featureEocReviewEnabled: true,
      strategyUsesRequired: true,
      secureAssessmentMode: true,
    },
  })

  if (!klass) notFound()

  return (
    <div className="space-y-8">
      <div>
        <Link href="/teacher/classes" className="text-sm text-indigo-600 hover:underline">
          ← Back to Classes
        </Link>
      </div>

      <RcClassSettingsForm
        classId={klass.id}
        className={klass.name}
        initial={{
          rcSessionLengthOverride: klass.rcSessionLengthOverride,
          rcAttemptsAllowed: klass.rcAttemptsAllowed,
          rcReviewWindow: klass.rcReviewWindow as
            | 'immediate'
            | 'after_submit'
            | 'after_class_window',
          rcStaminaOverride: klass.rcStaminaOverride,
          featureEocReviewEnabled: klass.featureEocReviewEnabled,
          secureAssessmentMode: klass.secureAssessmentMode,
          strategyUsesRequired: klass.strategyUsesRequired,
        }}
      />

      <StaminaLadderPreview />
    </div>
  )
}
