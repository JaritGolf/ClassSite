/**
 * Teacher Classes page.
 *
 * A class here is a label for a lesson arrangement and its Republic Challenge
 * settings. It has no roster: students have no accounts and are never enrolled.
 */

import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { getTeacherRoster } from '@/lib/teacher-roster'
import { EmptyState } from '@/components/teacher/shared/EmptyState'

export default async function ClassesPage() {
  const session = await requireAuth(['TEACHER'])
  const roster = await getTeacherRoster(session.user.userId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {roster.classes.length} class{roster.classes.length !== 1 ? 'es' : ''}. Classes hold
          lesson arrangements and settings only — this site keeps no list of students.
        </p>
      </div>

      {roster.classes.length === 0 ? (
        <EmptyState
          title="No classes yet"
          body="A class is created for you the first time you sign in. Students can use the site without one."
        />
      ) : (
        <ul className="space-y-3" role="list">
          {roster.classes.map((cls) => (
            <li
              key={cls.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
            >
              <div>
                <h2 className="font-semibold text-gray-800">{cls.name}</h2>
                {cls.period && <p className="text-xs text-gray-500">Period {cls.period}</p>}
              </div>
              <Link
                href={`/teacher/classes/${cls.id}/settings`}
                className="text-sm text-indigo-600 hover:underline"
              >
                Settings
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
