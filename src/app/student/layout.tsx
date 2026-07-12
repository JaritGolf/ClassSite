import { requireAuth, getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { StudentNav } from '@/components/student/layout/StudentNav'
import { PauseBanner } from '@/components/student/layout/PauseBanner'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireAuth(['STUDENT'])

  // Defaults (used if no student record / settings yet)
  let pausePointMinutes = 40
  let reduceMotion = false
  let highContrast = false
  let largeText = false

  const session = await getSession()
  if (session) {
    const student = await prisma.student.findUnique({
      where: { userId: session.user.userId },
      select: { id: true },
    })
    if (student) {
      const [settings, accommodations] = await Promise.all([
        prisma.studentUiSettings.findUnique({
          where: { studentId: student.id },
          select: {
            pausePointMinutes: true,
            reduceMotion: true,
            highContrast: true,
            largeText: true,
          },
        }),
        prisma.studentAccommodation.findMany({
          where: { studentId: student.id, active: true },
          select: { accommodation: { select: { code: true } } },
        }),
      ])

      if (settings) {
        pausePointMinutes = settings.pausePointMinutes
        reduceMotion = settings.reduceMotion
        highContrast = settings.highContrast
        largeText = settings.largeText
      }

      // Accommodations flow through without per-assignment toggle (Appendix G):
      // a teacher-granted accommodation forces the matching UI mode on.
      const codes = new Set(accommodations.map((a) => a.accommodation.code))
      if (codes.has('ACC-HIGH-CONTRAST')) highContrast = true
      if (codes.has('ACC-LARGE-TEXT')) largeText = true
      if (codes.has('ACC-BREAKS')) pausePointMinutes = Math.min(pausePointMinutes, 10)
    }
  }

  const themeClass = [
    reduceMotion && 'cq-reduce-motion',
    highContrast && 'cq-high-contrast',
    largeText && 'cq-large-text',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={themeClass}>
      <StudentNav />
      <main className="min-h-screen bg-indigo-50 bg-dots bg-[length:26px_26px]">{children}</main>
      <PauseBanner pausePointMinutes={pausePointMinutes} />
    </div>
  )
}
