import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ModeCard } from '@/components/student/republic-challenge/ModeCard'

const STIMULUS_TYPES: Array<{ code: string; label: string; description: string }> = [
  { code: 'EXCERPT', label: 'Excerpt', description: 'Short primary-source passages and quotes.' },
  { code: 'CHART', label: 'Chart', description: 'Bar/line/pie charts of civic data.' },
  { code: 'MAP', label: 'Map', description: 'Political and historical maps.' },
  { code: 'TABLE', label: 'Table', description: 'Data tables with civics facts.' },
  { code: 'FLOWCHART', label: 'Flowchart', description: 'Process diagrams (e.g. how a bill becomes a law).' },
  { code: 'TIMELINE', label: 'Timeline', description: 'Sequenced civics events.' },
  { code: 'POLITICAL_CARTOON', label: 'Political Cartoon', description: 'Cartoons making a civic argument.' },
  { code: 'DIAGRAM', label: 'Diagram', description: 'Structural diagrams (branches, federalism).' },
]

export default async function SourceSprintPickerPage() {
  await requireAuth(['STUDENT'])

  // Only sprint types that actually have questions behind them.
  //
  // Most of these eight have no approved stimuli yet, and their cards used to
  // POST straight into an HTTP 422 EMPTY_POOL. Computed from the same conditions
  // `pickSourceSprint` uses, so a type reappears by itself as soon as its
  // content lands — no list to remember to update.
  const withPool = await prisma.question.groupBy({
    by: ['stimulusId'],
    where: {
      active: true,
      approvalStatus: 'APPROVED',
      stimulus: { is: { approvalStatus: 'APPROVED' } },
    },
    _count: { _all: true },
  })
  const stimulusIds = withPool.map((r) => r.stimulusId).filter((id): id is string => id !== null)
  const stimuli = stimulusIds.length
    ? await prisma.stimulus.findMany({
        where: { id: { in: stimulusIds } },
        select: { stimulusType: true },
      })
    : []
  const availableTypes = new Set(stimuli.map((s) => s.stimulusType as string))
  const sprintTypes = STIMULUS_TYPES.filter((s) => availableTypes.has(s.code))

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <header>
        <Link
          href="/student/republic-challenge"
          className="text-sm font-semibold text-indigo-600 hover:underline"
        >
          ← Back to Republic Challenge
        </Link>
        <h1 className="font-display text-3xl font-bold text-indigo-900 mt-2">Source Sprint</h1>
        <p className="text-base text-gray-600 mt-1">
          Practice items with a specific kind of source material.
        </p>
      </header>

      {sprintTypes.length === 0 && (
        <p className="rounded-2xl border-2 border-gray-200 bg-white p-5 text-base text-gray-600">
          No source types are ready to practice yet. Check back once your teacher adds more sources.
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {sprintTypes.map((s) => (
          <ModeCard
            key={s.code}
            title={s.label}
            description={s.description}
            startUrl={`/api/republic-challenge/source-sprint/${s.code}/start`}
            length={10}
            meta="10 questions"
          />
        ))}
      </div>
    </div>
  )
}
