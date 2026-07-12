import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
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

      <div className="grid sm:grid-cols-2 gap-3">
        {STIMULUS_TYPES.map((s) => (
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
