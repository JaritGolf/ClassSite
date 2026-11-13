/**
 * Student area layout.
 *
 * PUBLIC. There is no sign-in, no session lookup and no cookie here: this
 * layout loads curriculum that is identical for every visitor and hands it to
 * a client shell, which fills in the student's own progress from their device.
 */

import { getBadgeCatalog, getPublishedClass, getStudentCatalog } from '@/lib/student-content'
import { getStrategyMissionCodes } from '@/lib/strategy-track'
import { StudentShell } from '@/components/student/shell/StudentShell'

// Rendered per request so newly approved content shows up immediately, and so
// a production build never needs the database.
export const dynamic = 'force-dynamic'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const [catalog, badges, publishedClass] = await Promise.all([
    getStudentCatalog(),
    getBadgeCatalog(),
    getPublishedClass(),
  ])

  return (
    <StudentShell
      data={{
        units: catalog.units,
        missions: catalog.missions,
        badges,
        strategyCodes: getStrategyMissionCodes(),
        strategyRequired: publishedClass?.strategyUsesRequired ?? 0,
      }}
    >
      {children}
    </StudentShell>
  )
}
