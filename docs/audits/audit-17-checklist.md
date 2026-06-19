# Audit 17 — District Readiness (§36.18)

Phase 17 closes the audit-log/export/retention code items and produces the
district-facing documentation. Two items require **district human sign-off** and are
recorded as owner-action-pending (they do not block the phase tag — ADR 0006).

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Audit log query and export functions work | ✅ Code | `src/lib/audit/{list,export}.ts`; `/admin/audit` + `GET /api/admin/audit/export`; `tests/integration/audit17/01` |
| 2 | CSV/PDF exports for student, class, EOC readiness reports | ✅ Code | `src/lib/export/reports.ts`; `/teacher/reports` (CSV via `GET /api/teacher/reports/export`, PDF via print); student CSV via `GET /api/teacher/students/[id]/report/export`; `tests/integration/audit17/02` |
| 3 | Privacy review documentation in `docs/` | ✅ Doc | `docs/privacy-review.md` |
| 4 | Hosting plan documented and reviewed | ⏳ Owner action | `docs/hosting-plan.md` written; **district review pending** |
| 5 | Clever and Google OAuth scopes verified against district policy | ⏳ Owner action | `docs/oauth-scopes.md` written; **district verification pending** |
| 6 | All env variables documented | ✅ Doc | `.env.example` (+ retention vars), `docs/runbook.md` |
| 7 | No third-party analytics on student data | ✅ Code | static guard `tests/integration/audit17/04` |
| 8 | Data retention policy documented and configurable | ✅ Code + Doc | `src/lib/retention/*`; `/admin/retention`; `npm run retention:purge`; `docs/data-retention.md`; `tests/integration/audit17/03` + `tests/unit/retention/policy.test.ts` |

## Verification (tiered gate, ADR 0006)

- **Tier 1 (blocking):** `./node_modules/.bin/tsc --noEmit` → 0 errors.
- **Tier 2 (blocking):** `npm test` → full suite green incl. `audit17` drivers + the
  `export`/`retention` unit tests.
- **Tier 3 (non-blocking, deferred):** `npm run build`, axe/e2e on `/admin/audit` +
  `/admin/retention` — see `docs/audits/deferred/phase-17.md`.

## Owner actions to fully close audit 17

1. Take `docs/hosting-plan.md` to PBCSD IT and obtain hosting/at-rest-encryption sign-off
   (item 4).
2. Verify the scopes in `docs/oauth-scopes.md` against district policy (item 5).
3. Set retention windows (`AUDIT_LOG_RETENTION_DAYS`, `VOIDED_ATTEMPT_RETENTION_DAYS`) for
   production.
4. Execute any district privacy/vendor agreement (spec §37).
