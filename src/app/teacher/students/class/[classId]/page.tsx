/**
 * Teacher Students → single class roster.
 *
 * Reached from a class button on the Students home. Lists the students enrolled
 * in one class with at-a-glance status columns (mastered count + needs-action
 * flag), each linking to the /teacher/students/[studentId] profile page.
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getTeacherRoster } from '@/lib/teacher-roster'
import { getStudentsNeedingAction } from '@/lib/class-analytics'
import { EmptyState } from '@/components/teacher/shared/EmptyState'

export default async function ClassRosterPage({
  params,
}: {
  params: { classId: string }
}) {
  const session = await requireAuth(['TEACHER'])

  const roster = await getTeacherRoster(session.user.userId)
  const cls = roster.classes.find((c) => c.id === params.classId)
  if (!cls) {
    // Not one of this teacher's classes (or doesn't exist) → 404, mirroring
    // the RosterError('FORBIDDEN') handling on sibling class routes. Scoping to
    // roster.classes is itself the authorization guard.
    notFound()
  }

  const studentIds = cls.studentIds

  const [students, masteredGroups, needingAction] = await Promise.all([
    studentIds.length === 0
      ? []
      : prisma.student.findMany({
          where: { id: { in: studentIds } },
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
          },
        }),
    studentIds.length === 0
      ? []
      : prisma.studentProgress.groupBy({
          by: ['studentId'],
          where: { studentId: { in: studentIds }, status: 'MASTERED' },
          _count: { _all: true },
        }),
    getStudentsNeedingAction(session.user.userId),
  ])

  const nameMap = new Map(
    students.map((s) => [s.id, `${s.user.firstName} ${s.user.lastName}`])
  )
  const masteredMap = new Map(
    masteredGroups.map((g) => [g.studentId, g._count._all])
  )
  const needsActionSet = new Set(needingAction.map((r) => r.studentId))

  // Sort students alphabetically for a stable, scannable roster.
  const sortedIds = [...studentIds].sort((a, b) =>
    (nameMap.get(a) ?? a).localeCompare(nameMap.get(b) ?? b)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/teacher/students" className="hover:text-indigo-600">
          Students
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-gray-600">{cls.name}</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{cls.name}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {cls.period ? `Period ${cls.period} · ` : ''}
          {studentIds.length} student{studentIds.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        {studentIds.length === 0 ? (
          <EmptyState
            title="No enrolled students"
            body="Students will appear here once they are enrolled in this class."
          />
        ) : (
          <ul className="divide-y divide-gray-50" role="list">
            {sortedIds.map((sid) => {
              const mastered = masteredMap.get(sid) ?? 0
              const needsAction = needsActionSet.has(sid)
              return (
                <li key={sid}>
                  <Link
                    href={`/teacher/students/${sid}`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-indigo-50 transition-colors"
                  >
                    <span className="min-w-0 truncate text-sm text-gray-700">
                      {nameMap.get(sid) ?? sid}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {needsAction && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          Needs action
                        </span>
                      )}
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                        Mastered: {mastered}
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
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
