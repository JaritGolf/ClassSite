import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getTeacherRoster } from '@/lib/teacher-roster'
import { TOGGLEABLE_STEP_TYPES } from '@/lib/lesson-content'

/**
 * Lesson media overview (ADR 0015): every benchmark with an APPROVED lesson,
 * its media-step inventory, and how many items are currently toggled off
 * (globally or for one of this teacher's classes).
 */
export default async function TeacherLessonsPage() {
  const session = await requireAuth(['TEACHER', 'ADMIN'])
  const roster = await getTeacherRoster(session.user.userId)
  const classIds = roster.classes.map((c) => c.id)

  const lessons = await prisma.lesson.findMany({
    where: { approvalStatus: 'APPROVED' },
    orderBy: { benchmark: { sequenceOrder: 'asc' } },
    select: {
      id: true,
      title: true,
      benchmark: { select: { code: true, title: true } },
      steps: {
        where: { stepType: { in: [...TOGGLEABLE_STEP_TYPES] } },
        select: {
          stepType: true,
          enabled: true,
          classVisibility: classIds.length
            ? { where: { classId: { in: classIds } }, select: { visible: true } }
            : false,
        },
      },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lesson Media</h1>
        <p className="mt-1 max-w-prose text-sm text-gray-600">
          Preview each lesson and choose which videos, images, diagrams, and infographics your
          students see — globally or per class. Core instruction (notes, checks, worked examples,
          source analyses) always stays on.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-4 py-3">Benchmark</th>
              <th className="px-4 py-3">Lesson</th>
              <th className="px-4 py-3">Media steps</th>
              <th className="px-4 py-3">Toggled off</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lessons.map((lesson) => {
              const counts = new Map<string, number>()
              let globallyOff = 0
              let classOverrides = 0
              for (const s of lesson.steps) {
                counts.set(s.stepType, (counts.get(s.stepType) ?? 0) + 1)
                if (!s.enabled) globallyOff++
                classOverrides += Array.isArray(s.classVisibility) ? s.classVisibility.length : 0
              }
              return (
                <tr key={lesson.id}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {lesson.benchmark.code}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{lesson.title}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {lesson.steps.length === 0
                      ? '—'
                      : [...counts.entries()]
                          .map(([t, n]) => `${n} ${t.toLowerCase()}`)
                          .join(' · ')}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {globallyOff > 0 && (
                      <span className="mr-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        {globallyOff} off globally
                      </span>
                    )}
                    {classOverrides > 0 && (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800">
                        {classOverrides} class override{classOverrides === 1 ? '' : 's'}
                      </span>
                    )}
                    {globallyOff === 0 && classOverrides === 0 && (
                      <span className="text-xs text-gray-500">all shown</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/teacher/lessons/${lesson.benchmark.code}/walkthrough`}
                        className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                      >
                        ▶ Walkthrough
                      </Link>
                      <Link
                        href={`/teacher/lessons/${lesson.benchmark.code}`}
                        className="rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                      >
                        Manage media
                      </Link>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
