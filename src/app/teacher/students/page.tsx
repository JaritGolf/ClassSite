/**
 * Teacher Students home — the top-level entry point for the "Students" nav tab.
 *
 * Layout: a search bar (jump straight to any student's profile), followed by
 * one button per active class. Each class button clicks through to that class's
 * student roster at /teacher/students/class/[classId].
 */

import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getTeacherRoster } from '@/lib/teacher-roster'
import { getStudentsNeedingAction } from '@/lib/class-analytics'
import { RosterPicker } from '@/components/teacher/shared/RosterPicker'
import { EmptyState } from '@/components/teacher/shared/EmptyState'
import Link from 'next/link'

export default async function TeacherStudentsPage() {
  const session = await requireAuth(['TEACHER'])
  const roster = await getTeacherRoster(session.user.userId)

  const studentIds = roster.allStudentIds

  const [students, needingAction] = await Promise.all([
    studentIds.length === 0
      ? []
      : prisma.student.findMany({
          where: { id: { in: studentIds } },
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
          },
        }),
    getStudentsNeedingAction(session.user.userId),
  ])

  const nameMap = new Map(
    students.map((s) => [s.id, `${s.user.firstName} ${s.user.lastName}`])
  )
  const needsActionSet = new Set(needingAction.map((r) => r.studentId))

  const pickerStudents = [...nameMap.entries()]
    .map(([id, displayName]) => ({ id, displayName }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Students</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {roster.classes.length} class{roster.classes.length !== 1 ? 'es' : ''} ·{' '}
          {studentIds.length} total student{studentIds.length !== 1 ? 's' : ''}
        </p>
      </div>

      {studentIds.length === 0 ? (
        <EmptyState
          title="No students yet"
          body="Students will appear here once they are enrolled in your classes."
        />
      ) : (
        <>
          {/* Search any student by name → jump to their profile */}
          <RosterPicker students={pickerStudents} />

          {/* One button per class → drills into that class's roster */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {roster.classes.map((cls) => {
              const needsActionCount = cls.studentIds.filter((sid) =>
                needsActionSet.has(sid)
              ).length
              return (
                <Link
                  key={cls.id}
                  href={`/teacher/students/class/${cls.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-4 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-800">{cls.name}</p>
                    <p className="text-xs text-gray-400">
                      {cls.period ? `Period ${cls.period} · ` : ''}
                      {cls.studentIds.length} student
                      {cls.studentIds.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-2">
                    {needsActionCount > 0 && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        {needsActionCount} needs action
                      </span>
                    )}
                    <svg
                      className="h-5 w-5 text-gray-300"
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
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
