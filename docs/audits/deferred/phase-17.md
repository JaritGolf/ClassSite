# Phase 17 — Deferred / Owner-Action Ledger

**Created:** 2026-06-19
**Governing decision:** ADR 0006 (Tiered Verification Gate), ADR 0011 (exports & retention)

## Verified locally (this session)

- ✅ `./node_modules/.bin/tsc --noEmit` = 0 errors.
- ✅ `npm test` — `audit17` integration drivers + `export` / `retention` unit tests green;
  full suite green.

## Tier-3 (non-blocking — run in CI / healthy env)

| # | Item | Status |
|---|---|---|
| D1 | `npm run build` (Next production build) | ⏳ Not run |
| D2 | axe e2e on `/admin/audit` + `/admin/retention` + `/teacher/reports` | ⏳ Not run |
| D3 | Manual export sanity (download CSVs, confirm no PII in URL, no answer-key columns) | ⏳ Not run |

## Operational (deferred by design)

| # | Item | Status |
|---|---|---|
| O1 | Scheduled retention purge (cron invoking `npm run retention:purge -- --apply`) | ⏳ Deferred — no queue/cron deployed (spec §26 optional). Run from hosting scheduler when needed. |

## Owner / district sign-off (audit §36.18 items 4 & 5)

| # | Item | Status |
|---|---|---|
| S1 | Hosting plan reviewed + approved by district (`docs/hosting-plan.md`) | ⏳ Owner action |
| S2 | Clever/Google OAuth scopes verified vs district policy (`docs/oauth-scopes.md`) | ⏳ Owner action |
| S3 | District privacy/vendor agreement executed (spec §37) | ⏳ Owner action |
| S4 | Production retention windows set (`AUDIT_LOG_RETENTION_DAYS`, `VOIDED_ATTEMPT_RETENTION_DAYS`) | ⏳ Owner action |
