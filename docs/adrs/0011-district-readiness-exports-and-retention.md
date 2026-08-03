# ADR 0011 — District Readiness: Exports & Configurable Retention

**Status:** Accepted
**Date:** 2026-06-19
**Phase:** 17 (§36.18)

## Context

Phase 17 prepares My Civics Class for district use: audit-log export, CSV/PDF report exports,
and a data-retention policy that must be "documented and configurable" (spec §25, audit
§36.18). The codebase has held a strict no-new-dependencies posture (Pearson inlined,
print-to-PDF per ADR 0008, L1 glosses schema-free) and has no background-job infrastructure
(spec §26 lists the queue as optional).

## Decisions

1. **CSV is hand-rolled; PDF stays browser print.** `src/lib/export/csv.ts` implements
   RFC-4180 quoting/escaping plus a spreadsheet formula-injection guard (~30 LOC). No CSV/PDF
   library is added. PDF export continues to use `window.print()` (ADR 0008). Consistent with
   precedent; reversible if server-side PDF/XLSX is later required.

2. **Exports are column-allowlisted.** Report builders (`src/lib/export/reports.ts`) compose
   existing analytics (`computeStudentReadiness`, `computeClassReadiness`,
   `getClassMasteryByBenchmark`) and emit only aggregate progress/readiness columns. They
   never touch `isCorrect`, options, feedback, or item-level distractor data (rules #2/#9,
   spec §25.2). A forbidden-token test (`audit17/02`) enforces this.

3. **No PII in URLs.** CSV data is delivered in the response body via `Content-Disposition`;
   only non-PII filter params appear in query strings (spec §25.2).

4. **Retention is env-configurable and infra-free.** `src/lib/retention/policy.ts` resolves
   thresholds from `AUDIT_LOG_RETENTION_DAYS` / `VOIDED_ATTEMPT_RETENTION_DAYS` (default 0 =
   retain forever — conservative). `purgeExpiredData` deletes only aged audit logs and aged
   *voided* attempts (children first, in a transaction) and logs a `RETENTION_PURGE` entry.
   Exposed via `POST /api/admin/retention/purge` (dry-run default), `/admin/retention`, and
   `npm run retention:purge`. **No cron/queue is deployed** — scheduling is left to the
   hosting environment and recorded in the deferred ledger.

5. **District-policy items ship as documentation, not as claimed-verified.** Hosting approval
   (`docs/hosting-plan.md`) and OAuth-scope verification (`docs/oauth-scopes.md`) require the
   district. They are written for sign-off and marked owner-action-pending in the audit
   checklist; per ADR 0006 they do not block the phase tag.

## Consequences

- No new dependencies; export/retention logic is unit- and integration-tested.
- Retention "configurable" = env thresholds + documented manual/admin runs; if the district
  needs automated scheduled purges, add a cron invoking the existing script (no code change).
- Audit-log catalog gains: `REPORT_EXPORTED`, `AUDIT_LOG_EXPORTED`, `RETENTION_PURGE`.
- New env vars: `AUDIT_LOG_RETENTION_DAYS`, `VOIDED_ATTEMPT_RETENTION_DAYS`.
- No schema change.
