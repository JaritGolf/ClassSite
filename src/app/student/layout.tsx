import { requireAuth, getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { StudentNav, type StudentNavBadges } from '@/components/student/layout/StudentNav'
import { PauseBanner } from '@/components/student/layout/PauseBanner'
import { ActivityHeartbeat } from '@/components/student/layout/ActivityHeartbeat'
import { AccommodationPrefsProvider } from '@/components/student/AccommodationPrefsProvider'
import { resolveDisplayPrefs, NO_DISPLAY_PREFS, type DisplayPrefs } from '@/lib/accommodations'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireAuth(['STUDENT'])

  // Defaults (used if no student record / settings yet)
  let pausePointMinutes = 40
  let reduceMotion = false
  let highContrast = false
  let largeText = false
  // Nav count badges — "there is work waiting here". Two cheap indexed counts
  // only: this layout runs on EVERY student page, so it must not pull in the
  // next-step resolver's availability queries just to decorate a tab.
  let navBadges: StudentNavBadges = {}
  // Display accommodations (ACC-CHUNK, ACC-T2-VOCAB) — resolved here because the
  // active codes are already being loaded below, and passed to a client provider
  // so passages render accommodated on the very first paint.
  let displayPrefs: DisplayPrefs = NO_DISPLAY_PREFS

  const session = await getSession()
  if (session) {
    const student = await prisma.student.findUnique({
      where: { userId: session.user.userId },
      select: { id: true },
    })
    if (student) {
      const [settings, accommodations, drillDueCount, remediationCount] = await Promise.all([
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
        // Uses the `due_at` index the spaced-retrieval engine already requires.
        prisma.spacedReviewState.count({
          where: { studentId: student.id, dueAt: { lte: new Date() } },
        }),
        prisma.studentRemediation.count({
          where: { studentId: student.id, status: 'ASSIGNED' },
        }),
      ])

      navBadges = {
        '/student/daily-drill': drillDueCount,
        // Assigned remediation surfaces on the Dashboard, which is where the
        // ranked plan that links to it lives.
        '/student/dashboard': remediationCount,
      }

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
      displayPrefs = resolveDisplayPrefs(codes)
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
      <StudentNav badges={navBadges} />
      <main className="min-h-screen bg-indigo-50 bg-dots bg-[length:26px_26px]">
        <AccommodationPrefsProvider prefs={displayPrefs}>{children}</AccommodationPrefsProvider>
      </main>
      <PauseBanner pausePointMinutes={pausePointMinutes} />
      {/* Invisible — records session start/duration. Renders nothing. */}
      <ActivityHeartbeat />
    </div>
  )
}
