# Civics Quest — Data Retention Policy (Phase 17)

> Audit §36.18 item 8. The retention policy is **configurable** via environment variables and
> **conservative by default** (retain everything). No data is deleted unless an admin sets a
> positive threshold and explicitly runs the purge.

## Policy model

Three data classes can be aged out:

| Data class | Env variable | Default | What is removed |
|---|---|---|---|
| Audit logs | `AUDIT_LOG_RETENTION_DAYS` | `0` (keep forever) | `AuditLog` rows with `createdAt` older than the threshold |
| Voided assessment attempts | `VOIDED_ATTEMPT_RETENTION_DAYS` | `0` (keep forever) | `AssessmentAttempt` rows where `voided = true` and `submittedAt` older than the threshold, plus their `AttemptResponse` / `AdaptiveSessionState` children |
| Student activity sessions | `ACTIVITY_SESSION_RETENTION_DAYS` | `0` (keep forever) | `StudentActivitySession` rows with `startedAt` older than the threshold (ADR 0019) |
| Assessment focus events | _(none — follows the attempt)_ | n/a | `AttemptIntegrityEvent` rows are deleted with their voided attempt under `VOIDED_ATTEMPT_RETENTION_DAYS` (ADR 0020) |

`0`, unset, negative, or non-numeric values all mean **retain forever**. Fractions are floored.

**Only voided attempts are eligible** — active mastery/progression data is never purged by this
policy. Content is archived (not deleted) via the content-approval flow.

**Activity sessions are monitoring data, not academic records.** They record when a student was
on the platform and for how long. Purging them removes only that monitoring history — no student
work, scores, mastery state, or spaced-review state is touched, and the rows have no children.
Districts may reasonably want a *shorter* window here than for academic records: behavioral
observation of a minor has less justification for long-term storage than the coursework itself.

### Not yet covered: suggestions (ADR 0021) — OWNER DECISION PENDING

The `suggestions` table (nav-bar suggestion box) stores **student- and teacher-authored free
text** and is **not** currently covered by any retention window. Rows are retained indefinitely.

This is recorded rather than silently shipped because it is the first student-authored prose in
the database, and free text is a different privacy class from the structured progression data
this policy was written for. Two mitigations are already in place:

- the suggestion body is **never** copied into `AuditLog.metadataJson`, so it is not reachable
  through `/api/admin/audit/export` (the audit metadata carries `bodyChars`, not the body);
- there is **no** suggestions CSV export, deliberately — see ADR 0021 §7.

**Owner decision needed:** either
(a) retain indefinitely, and say so explicitly in the district privacy packet; or
(b) add `SUGGESTION_RETENTION_DAYS` to `resolveRetentionConfig` plus a purge branch in
`purgeExpiredData` (~20 lines, mirroring the existing data classes) — a natural window would be
one school year, since a suggestion's value is almost entirely in the term it was written.

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
