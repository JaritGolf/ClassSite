import Link from 'next/link'
import { prisma } from '@/lib/db'
import { ModeCard } from '@/components/student/republic-challenge/ModeCard'

export const metadata = { title: 'Category Challenge' }

export default async function CategoryPickerPage() {
  // Only categories with a real pool — an empty one would start nothing.
  const categories = await prisma.reportingCategory.findMany({
    where: {
      benchmarks: { some: { questions: { some: { active: true, approvalStatus: 'APPROVED' } } } },
    },
    select: { id: true, name: true, description: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header>
        <Link href="/student/republic-challenge" className="text-sm font-semibold text-indigo-600 hover:underline">
          ← Back to Republic Challenge
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold text-indigo-900">Category Challenge</h1>
        <p className="mt-1 text-base text-gray-600">Pick a reporting category to practice.</p>
      </header>
      {categories.length === 0 && (
        <p className="rounded-2xl border-2 border-gray-200 bg-white p-5 text-base text-gray-600">
          No categories are ready to practice yet. Check back once more missions are added.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {categories.map((cat) => (
          <ModeCard
            key={cat.id}
            title={cat.name}
            description={cat.description ?? ''}
            href={`/student/republic-challenge/play?mode=CATEGORY_CHALLENGE&category=${cat.id}`}
            meta="10 questions"
          />
        ))}
      </div>
    </div>
  )
}
