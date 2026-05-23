import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ModeCard } from '@/components/student/republic-challenge/ModeCard'

export default async function CategoryPickerPage() {
  await requireAuth(['STUDENT'])

  const categories = await prisma.reportingCategory.findMany({
    select: { id: true, name: true, description: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <header>
        <Link
          href="/student/republic-challenge"
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Back to Republic Challenge
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">Category Challenge</h1>
        <p className="text-sm text-gray-600 mt-1">
          Pick a reporting category to practice.
        </p>
      </header>

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
