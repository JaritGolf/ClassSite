import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getProgressPlanForClass, ProgressCheckpointError } from '@/lib/progress-checkpoints'
import { ProgressTargetsForm } from '@/components/teacher/progress-targets/ProgressTargetsForm'

// The root layout's title template appends " — My Civics Class", so this is a
// bare title. (The nine-week work predates the rebrand and hardcoded the old
// brand here, which rendered as "… — Civics Quest — My Civics Class".)
export const metadata = { title: 'Nine-Week Progress Targets' }

export default async function ProgressTargetsPage({
  params,
}: {
  params: { classId: string }
}) {
  const session = await requireAuth(['TEACHER', 'ADMIN'])

  // getProgressPlanForClass performs the roster check itself.
  let view
  try {
    view = await getProgressPlanForClass(session.user.userId, params.classId)
  } catch (e) {
    if (e instanceof ProgressCheckpointError) notFound()
    throw e
  }

  const klass = await prisma.class.findUnique({
    where: { id: params.classId },
    select: { id: true, name: true },
  })
  if (!klass) notFound()

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/teacher/classes" className="text-sm text-indigo-600 hover:underline">
          ← Back to Classes
        </Link>
        <Link
          href={`/teacher/classes/${klass.id}/settings`}
          className="text-sm text-indigo-600 hover:underline"
        >
          Class settings
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold text-gray-900">Nine-Week Progress Targets</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-600">
          Set where on the Mission Map students should have reached by the end of each nine weeks.
          Students see only their Level, never a score for this. Progress is never blocked by a
          date — a student who is ready to keep going always can.
        </p>
      </div>

      <ProgressTargetsForm classId={klass.id} className={klass.name} initial={view} />
    </div>
  )
}
