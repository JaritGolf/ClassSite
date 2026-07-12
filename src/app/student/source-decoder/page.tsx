import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getSourceDecoderProgress, getSourceDecoderMissions } from '@/lib/reading-load'
import { SourceDecoderTrack } from '@/components/source-decoder/SourceDecoderTrack'

const SAMPLE_PASSAGE =
  'We hold these truths to be self-evident, that all men are created equal, that they are ' +
  'endowed by their Creator with certain unalienable Rights, that among these are Life, ' +
  'Liberty and the pursuit of Happiness.'

export default async function SourceDecoderPage() {
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

  const { progress } = await getSourceDecoderProgress(student.id)
  const missions = getSourceDecoderMissions()
  const completedLevels = progress.filter((p) => p.isCompleted).map((p) => p.level)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <header>
        <p className="font-display text-xs font-bold uppercase tracking-widest text-sky-600">Parallel Track</p>
        <h1 className="font-display text-3xl font-bold text-indigo-900">Source Decoder</h1>
        <p className="mt-1 text-base text-gray-600">
          Level up your reading skills for tough EOC passages. Complete each level to unlock the
          next — and to earn access to the hardest source questions.
        </p>
      </header>

      <SourceDecoderTrack
        missions={missions}
        completedLevels={completedLevels}
        sampleStimulus={SAMPLE_PASSAGE}
      />
    </div>
  )
}
