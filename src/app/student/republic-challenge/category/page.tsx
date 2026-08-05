import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ModeCard } from '@/components/student/republic-challenge/ModeCard'

export default async function CategoryPickerPage() {
  await requireAuth(['STUDENT'])

  // Only categories that actually have a question pool.
  //
  // Three of the four have zero approved questions today (the build scope is
  // deliberately limited), and their cards used to POST straight into an HTTP
  // 422 EMPTY_POOL — a dead end that looks like the app is broken. This is
  // computed rather than hardcoded, so each category reappears on its own the
  // moment its content is approved. Mirrors `pickByCategory`'s own filter.
  const categories = await prisma.reportingCategory.findMany({
    where: {
      benchmarks: {
        some: { questions: { some: { active: true, approvalStatus: 'APPROVED' } } },
      },
    },
    select: { id: true, name: true, description: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <header>
        <Link
          href="/student/republic-challenge"
          className="text-sm font-semibold text-indigo-600 hover:underline"
        >
          ← Back to Republic Challenge
        </Link>
        <h1 className="font-display text-3xl font-bold text-indigo-900 mt-2">Category Challenge</h1>
        <p className="text-base text-gray-600 mt-1">
          Pick a reporting category to practice.
        </p>
      </header>

      {categories.length === 0 && (
        <p className="rounded-2xl border-2 border-gray-200 bg-white p-5 text-base text-gray-600">
          No categories are ready to practice yet. Check back once your teacher adds more missions.
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {categories.map((cat) => (
          <ModeCard
            key={cat.id}
            title={cat.name}
            description={cat.description ?? ''}
            startUrl={`/api/republic-challenge/category/${cat.id}/start`}
            length={10}
            meta="10 questions"
          />
        ))}
      </div>
    </div>
  )
}
