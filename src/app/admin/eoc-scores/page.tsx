/**
 * /admin/eoc-scores
 *
 * List EOC actual scores and provide a CSV-paste import form.
 * Server component — fetches scores via direct DB query.
 */

import { prisma } from '@/lib/db'
import { ScoreListTable } from '@/components/admin/eoc-scores/ScoreListTable'
import { ScoreImportForm } from '@/components/admin/eoc-scores/ScoreImportForm'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

// Default to current school year (calendar-based: August–July)
function currentSchoolYear(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1-indexed
  const startYear = month >= 8 ? year : year - 1
  return `${startYear}-${startYear + 1}`
}

export default async function EocScoresPage() {
  const schoolYear = currentSchoolYear()

  const scores = await prisma.eocActualScore.findMany({
    where: { schoolYear },
    select: {
      id: true,
      studentId: true,
      schoolYear: true,
      scaledScore: true,
      achievementLevel: true,
      enteredAt: true,
      consentAcknowledged: true,
      student: {
        select: {
          user: { select: { email: true, firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { enteredAt: 'desc' },
    take: 500,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          <ExplainerHover
            theme="admin"
            variant="underline"
            title="EOC Scores"
            text="Students' actual end-of-course exam results, entered here once the district releases them. Used to check how well in-app readiness estimates predicted real scores."
          >
            EOC Scores
          </ExplainerHover>
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          School year: <span className="font-medium">{schoolYear}</span>
          {' — '}
          {scores.length} score{scores.length !== 1 ? 's' : ''} on file
        </p>
      </div>

      <ScoreImportForm />

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Scores on File</h2>
        <ScoreListTable scores={scores} />
      </div>
    </div>
  )
}
