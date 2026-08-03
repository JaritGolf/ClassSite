# My Civics Class — Data Retention Policy (Phase 17)

> Audit §36.18 item 8. The retention policy is **configurable** via environment variables and
> **conservative by default** (retain everything). No data is deleted unless an admin sets a
> positive threshold and explicitly runs the purge.

## Policy model

Two data classes can be aged out:

| Data class | Env variable | Default | What is removed |
|---|---|---|---|
| Audit logs | `AUDIT_LOG_RETENTION_DAYS` | `0` (keep forever) | `AuditLog` rows with `createdAt` older than the threshold |
| Voided assessment attempts | `VOIDED_ATTEMPT_RETENTION_DAYS` | `0` (keep forever) | `AssessmentAttempt` rows where `voided = true` and `submittedAt` older than the threshold, plus their `AttemptResponse` / `AdaptiveSessionState` children |

`0`, unset, negative, or non-numeric values all mean **retain forever**. Fractions are floored.

**Only voided attempts are eligible** — active mastery/progression data is never purged by this
policy. Content is archived (not deleted) via the content-approval flow.

## How it works

- Pure policy resolution: `src/lib/retention/policy.ts` (`resolveRetentionConfig`, `cutoffDate`).
- Purge runner: `src/lib/retention/purge.ts` (`purgeExpiredData`). Deletes children before
  parents inside a transaction and writes a `RETENTION_PURGE` audit log.
- Every purge supports a **dry run** that reports eligible counts without deleting.

## Running a purge

**Preview (safe, default):**
```
npm run retention:purge            # dry run — prints eligible counts
```

**Apply:**
```
npm run retention:purge -- --apply # actually deletes
```

**From the admin UI:** `/admin/retention` shows the active policy and a live dry-run preview,
with a guarded "Run purge now" button (ADMIN only). The API is
`POST /api/admin/retention/purge` with `{ "dryRun": false }` to apply.

## Scheduling

No scheduler is deployed (spec §26 lists the background queue as optional). To run retention on
a schedule, invoke `npm run retention:purge -- --apply` from a cron/scheduled job in your
hosting environment. Tracked in `docs/audits/deferred/phase-17.md`.

## District configuration

Set the thresholds per the district's approved retention windows before production (e.g.
`AUDIT_LOG_RETENTION_DAYS=1095` for 3 years). Record the approved values with the privacy
sign-off (`docs/privacy-review.md`).
