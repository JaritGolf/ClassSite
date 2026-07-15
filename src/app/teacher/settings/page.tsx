import { requireAuth } from '@/lib/auth'
import { getTeacherRoster } from '@/lib/teacher-roster'
import { SubModeToggle } from '@/components/teacher/sub-mode/SubModeToggle'
import { SubNotesEditor } from '@/components/teacher/sub-mode/SubNotesEditor'
import { getSubMode } from '@/lib/substitute-mode'

export default async function SettingsPage() {
  const session = await requireAuth(['TEACHER', 'ADMIN'])
  const roster = await getTeacherRoster(session.user.userId)
  const subModeOn = await getSubMode()

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Teacher Settings</h1>

      {/* Substitute Mode Toggle */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Substitute Mode</h2>
        <p className="text-sm text-gray-600 mb-4">
          When on, all write actions are blocked. Use when a substitute is covering your class.
        </p>
        <SubModeToggle initialOn={subModeOn} />
      </section>

      {/* Per-class Sub Prep Notes */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Substitute Prep Notes</h2>
        <p className="text-sm text-gray-600 mb-4">
          Leave notes for your substitute for each class.
        </p>
        <div className="space-y-4">
          {roster.classes.map((cls) => (
            <SubNotesEditor
              key={cls.id}
              classId={cls.id}
              className={cls.name}
              period={cls.period}
              initialNotes={cls.subPrepNotes ?? ''}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
