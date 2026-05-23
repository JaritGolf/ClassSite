/**
 * Teacher Classes page — shows the roster of classes and students.
 */

import { requireAuth } from '@/lib/auth'
import { getTeacherRoster } from '@/lib/teacher-roster'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { EmptyState } from '@/components/teacher/shared/EmptyState'

export default async function ClassesPage() {
  const session = await requireAuth(['TEACHER'])
  const roster = await getTeacherRoster(session.user.userId)

  // Fetch student display names
  const studentIds = roster.allStudentIds
  const students =
    studentIds.length === 0
      ? []
      : await prisma.student.findMany({
          where: { id: { in: studentIds } },
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
          },
        })

  const studentMap = new Map(
    students.map((s) => [s.id, `${s.user.firstName} ${s.user.lastName}`])
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {roster.classes.length} class{roster.classes.length !== 1 ? 'es' : ''} · {roster.allStudentIds.length} total students
        </p>
      </div>

      {roster.classes.length === 0 ? (
        <EmptyState
          title="No classes yet"
          body="Classes will appear here once they are set up in your district's system."
        />
      ) : (
        <div className="space-y-6">
          {roster.classes.map((cls) => (
            <div key={cls.id} className="rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <div>
                  <h2 className="font-semibold text-gray-800">{cls.name}</h2>
                  {cls.period && (
                    <p className="text-xs text-gray-400">Period {cls.period}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">{cls.studentIds.length} students</span>
                  <Link
                    href={`/teacher/classes/${cls.id}/settings`}
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    Settings
                  </Link>
                </div>
              </div>
              {cls.studentIds.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400">No enrolled students.</p>
              ) : (
                <ul className="divide-y divide-gray-50" role="list">
                  {cls.studentIds.map((sid) => (
                    <li key={sid}>
                      <Link
                        href={`/teacher/students/${sid}`}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-indigo-50 transition-colors"
                      >
                        <span className="text-sm text-gray-700">
                          {studentMap.get(sid) ?? sid}
                        </span>
                        <svg
                          className="h-4 w-4 text-gray-300"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
