/**
 * /admin/retention
 *
 * Shows the active (env-configured) data-retention policy and a live dry-run
 * preview of how many rows are currently eligible for deletion, plus a guarded
 * "run purge" control (audit §36.18 item 8).
 *
 * ADMIN-gated by the admin layout. Server component.
 */

import { resolveRetentionConfig, purgeExpiredData } from '@/lib/retention'
import { RetentionRunButton } from '@/components/admin/retention/RetentionRunButton'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

function describeDays(days: number): string {
  return days > 0 ? `${days} days` : 'Retain forever (disabled)'
}

export default async function RetentionPage() {
  const config = resolveRetentionConfig()
  const preview = await purgeExpiredData({ dryRun: true, config })
  const anyConfigured =
    config.auditLogRetentionDays > 0 ||
    config.voidedAttemptRetentionDays > 0 ||
    config.activitySessionRetentionDays > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Retention</h1>
        <p className="text-sm text-gray-600 mt-1">
          Policy is configured via environment variables and applies only when an
          admin runs a purge. See <code>docs/data-retention.md</code>.
        </p>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Policy</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">
              Audit logs (AUDIT_LOG_RETENTION_DAYS)
            </dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">
              {describeDays(config.auditLogRetentionDays)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">
              Voided attempts (VOIDED_ATTEMPT_RETENTION_DAYS)
            </dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">
              {describeDays(config.voidedAttemptRetentionDays)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">
              <ExplainerHover
                theme="admin"
                variant="underline"
                title="Activity sessions"
                text="Records of when students were on the platform and for how long. Purging these removes the monitoring history only — no student work, scores, or mastery data is affected."
              >
                Activity sessions
              </ExplainerHover>{' '}
              (ACTIVITY_SESSION_RETENTION_DAYS)
            </dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">
              {describeDays(config.activitySessionRetentionDays)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          <ExplainerHover
            theme="admin"
            variant="underline"
            title="Dry-run preview"
            text={'A preview only — it counts what would be deleted without actually deleting anything. Nothing is removed until you click "Run purge now" below.'}
          >
            Dry-run preview
          </ExplainerHover>{' '}
          (eligible now)
        </h2>
        {anyConfigured ? (
          <ul className="space-y-1 text-sm text-gray-700">
            <li>
              Audit logs eligible for deletion:{' '}
              <span className="font-semibold">{preview.auditLogsDeleted}</span>
            </li>
            <li>
              Voided attempts eligible:{' '}
              <span className="font-semibold">{preview.voidedAttemptsDeleted}</span>{' '}
              ({preview.attemptResponsesDeleted} responses)
            </li>
            <li>
              Activity sessions eligible:{' '}
              <span className="font-semibold">
                {preview.activitySessionsDeleted}
              </span>
            </li>
          </ul>
        ) : (
          <p className="text-sm text-gray-500">
            No retention thresholds are set — nothing is eligible for deletion.
            Set the environment variables above to enable purging.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Run purge</h2>
        <p className="text-sm text-red-700 mb-4">
          Permanently deletes rows past the thresholds. Irreversible. Recorded in
          the audit log as <code>RETENTION_PURGE</code>.
        </p>
        <RetentionRunButton enabled={anyConfigured} />
      </section>
    </div>
  )
}
