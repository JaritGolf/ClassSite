/**
 * Teacher — Calibration Dashboard page.
 *
 * Shows class calibration trend and overconfidence pattern list.
 * Server component.
 */

import { requireAuth } from '@/lib/auth'
import { getClassCalibrationTrend, getOverconfidenceStudents } from '@/lib/calibration-analytics'
import { ClassCalibrationTrend } from '@/components/teacher/calibration/ClassCalibrationTrend'
import { OverconfidencePatternList } from '@/components/teacher/calibration/OverconfidencePatternList'
import { EmptyState } from '@/components/teacher/shared/EmptyState'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

export default async function CalibrationPage() {
  const session = await requireAuth(['TEACHER'])
  const userId = session.user.userId

  const [trend, overconfidence] = await Promise.all([
    getClassCalibrationTrend(userId),
    getOverconfidenceStudents(userId),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          <ExplainerHover
            theme="admin"
            variant="underline"
            title="Calibration"
            text={"Whether students' confidence ratings match their actual accuracy — a well-calibrated student says \"Very sure\" only when they're right."}
          >
            Calibration Dashboard
          </ExplainerHover>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Calibration measures whether students&apos; confidence matches their accuracy.
          A well-calibrated student is &quot;Very sure&quot; only when they&apos;re actually correct.
        </p>
      </div>

      {/* Class calibration trend */}
      {trend.length === 0 ? (
        <EmptyState
          title="No calibration data yet"
          body="Calibration data will appear once students complete assessments with confidence ratings."
        />
      ) : (
        <ClassCalibrationTrend points={trend} />
      )}

      {/* Overconfidence patterns */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">
          <ExplainerHover
            theme="admin"
            variant="underline"
            title="Overconfidence Patterns"
            text="Students who say they're very sure but are frequently wrong — a sign they may need to slow down and double-check before answering."
          >
            Overconfidence Patterns
          </ExplainerHover>
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Students who are frequently &quot;Very sure&quot; but wrong (gap ≥ 30%). Minimum 5 high-confidence
          responses required.
        </p>
        {overconfidence.length === 0 ? (
          <EmptyState
            title="No overconfidence flagged"
            body="No students currently meet the overconfidence threshold."
          />
        ) : (
          <OverconfidencePatternList rows={overconfidence} />
        )}
      </div>
    </div>
  )
}
