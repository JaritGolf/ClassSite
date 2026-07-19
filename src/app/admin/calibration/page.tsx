/**
 * /admin/calibration
 *
 * EOC calibration dashboard. Shows:
 *   1. Calibration status banner (year-one state when no scores)
 *   2. "Run Calibration" button (when scores exist)
 *   3. Past calibration runs with recommended weights and approval UI
 *
 * Server component — data fetched via domain functions.
 */

import { prisma } from '@/lib/db'
import { getCalibrationStatus, getActiveWeightSource } from '@/lib/eoc-analytics'
import { CalibrationStatusBanner } from '@/components/admin/calibration/CalibrationStatusBanner'
import { RunCalibrationButton } from '@/components/admin/calibration/RunCalibrationButton'
import { CalibrationRunCard } from '@/components/admin/calibration/CalibrationRunCard'
import { ActiveWeightsPanel } from '@/components/admin/calibration/ActiveWeightsPanel'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

function currentSchoolYear(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const startYear = month >= 8 ? year : year - 1
  return `${startYear}-${startYear + 1}`
}

export default async function CalibrationPage() {
  const schoolYear = currentSchoolYear()

  const [calibrationStatus, runs, activeWeightSource] = await Promise.all([
    getCalibrationStatus(schoolYear),
    prisma.eocCalibrationRun.findMany({
      where: { schoolYear },
      orderBy: { runAt: 'desc' },
      take: 10,
    }),
    getActiveWeightSource(),
  ])

  const canRun =
    calibrationStatus.status === 'AWAITING_FIRST_RUN' ||
    calibrationStatus.status === 'RUN_PENDING_APPROVAL' ||
    calibrationStatus.status === 'RUN_APPROVED'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          <ExplainerHover
            theme="admin"
            variant="underline"
            title="EOC Calibration"
            text="Compares how well the app's readiness estimates predicted students' real EOC scores, and lets you approve adjusted category weights based on that comparison."
          >
            EOC Calibration
          </ExplainerHover>
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          School year: <span className="font-medium">{schoolYear}</span>
        </p>
      </div>

      <CalibrationStatusBanner
        status={calibrationStatus.status}
        scoreCount={calibrationStatus.scoreCount}
      />

      <ActiveWeightsPanel source={activeWeightSource} />

      {canRun && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Compute Pearson correlations between readiness metrics and actual scaled scores.
          </p>
          <RunCalibrationButton schoolYear={schoolYear} />
        </div>
      )}

      {runs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Calibration Runs</h2>
          <div className="space-y-4">
            {runs.map((run) => (
              <CalibrationRunCard
                key={run.id}
                run={{
                  ...run,
                  correlationReadinessToScaled: run.correlationReadinessToScaled ?? null,
                  recommendedWeightChanges: run.recommendedWeightChanges as Record<
                    string,
                    { current: number; recommended: number; deltaPercent: number }
                  > | null,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {runs.length === 0 && calibrationStatus.status !== 'YEAR_ONE_NO_SCORES' && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          No calibration runs yet. Click &quot;Run Calibration&quot; to get started.
        </div>
      )}
    </div>
  )
}
