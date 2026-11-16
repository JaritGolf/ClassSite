import Link from 'next/link'
import { prisma } from '@/lib/db'
import { ModeCard } from '@/components/student/republic-challenge/ModeCard'

export const metadata = { title: 'Source Sprint' }

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
  // Only source types with a real pool — computed, so they reappear as content lands.
  const stimuli = await prisma.stimulus.findMany({
    where: {
      approvalStatus: 'APPROVED',
      questions: { some: { active: true, approvalStatus: 'APPROVED' } },
    },
    select: { stimulusType: true },
  })
  const available = new Set(stimuli.map((s) => s.stimulusType as string))
  const sprintTypes = STIMULUS_TYPES.filter((s) => available.has(s.code))

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header>
        <Link href="/student/republic-challenge" className="text-sm font-semibold text-indigo-600 hover:underline">
          ← Back to Republic Challenge
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold text-indigo-900">Source Sprint</h1>
        <p className="mt-1 text-base text-gray-600">Practice items with a specific kind of source material.</p>
      </header>
      {sprintTypes.length === 0 && (
        <p className="rounded-2xl border-2 border-gray-200 bg-white p-5 text-base text-gray-600">
          No source types are ready to practice yet. Check back once more sources are added.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {sprintTypes.map((s) => (
          <ModeCard
            key={s.code}
            title={s.label}
            description={s.description}
            href={`/student/republic-challenge/play?mode=SOURCE_SPRINT&source=${s.code}`}
            meta="10 questions"
          />
        ))}
      </div>
    </div>
  )
}
