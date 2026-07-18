import Link from 'next/link'
import { prisma } from '@/lib/db'

/**
 * /admin/lessons
 *
 * Every benchmark with an APPROVED lesson, linking to its content editor.
 * Admin-only (inherited from src/app/admin/layout.tsx).
 */
export default async function AdminLessonsPage() {
  const lessons = await prisma.lesson.findMany({
    where: { approvalStatus: 'APPROVED' },
    orderBy: { benchmark: { sequenceOrder: 'asc' } },
    select: {
      id: true,
      title: true,
      benchmark: { select: { code: true, title: true } },
      steps: { select: { id: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lesson Content</h1>
        <p className="mt-1 max-w-prose text-sm text-gray-600">
          Edit the global default content of any lesson step, or add/remove/reorder steps. For
          per-class overrides, teachers use their own class edit page.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-4 py-3">Benchmark</th>
              <th className="px-4 py-3">Lesson</th>
              <th className="px-4 py-3">Steps</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lessons.map((lesson) => (
              <tr key={lesson.id}>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">
                  {lesson.benchmark.code}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{lesson.title}</td>
                <td className="px-4 py-3 text-gray-700">{lesson.steps.length}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/lessons/${lesson.benchmark.code}`}
                    className="rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                  >
                    Edit content
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
