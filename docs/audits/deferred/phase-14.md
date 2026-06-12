# Phase 14 — Deferred Audit Ledger

**Created:** 2026-06-11
**Governing decision:** ADR 0006 (Tiered Verification Gate)

Phase 14 (Parent Progress Summary) adds a teacher-generated, print-to-PDF student
progress summary (`src/lib/parent-summary/`, `/teacher/students/[id]/parent-summary`).
This ledger records verification steps deferred to CI / a healthy Node environment.

## Verified locally (reliably)

- ✅ **`./node_modules/.bin/tsc --noEmit` → 0 errors** (2026-06-11). Use the local bin or
  `npm run typecheck` — never `npx tsc` (resolves to a bogus package that can wipe
  `node_modules`).

## Deferred (run in CI / healthy env)

| # | Item | Status | Notes |
|---|------|--------|-------|
| D1 | `jest` Phase 14 drivers (`tests/integration/audit14/01–04`) + unit (`tests/unit/parent-summary/fields-allowlist.test.ts`) | ⛔ Blocked locally | Same jest harness bootstrap hang as Phases 12–13: a bounded run (70s) of the pure unit test produced **zero output** before being reaped — reaped before any test executes. Environmental, not code. NOT claimed as passed. |
| D2 | Full `jest` suite (regression) | ⛔ Blocked locally | Run in CI. |
| D3 | `npm run build` | ⏳ Not run | Run in CI. |
| D4 | axe e2e (parent-summary page) | ⏳ Not run | Add page to `tests/e2e/a11y.test.ts`; run in CI. |
| D5 | Manual a11y (keyboard, 200% zoom, VoiceOver) + manual "Save as PDF" check | ⏳ Owner-pending | Procedures in `docs/audits/audit-14-checklist.md`. |

## How to clear

```bash
brew link node@22   # ensure Node 22 LTS
npm ci
npx prisma generate
./node_modules/.bin/tsc --noEmit                 # green
npm test                                          # D1, D2
npm run build                                     # D3
E2E=1 npx playwright test tests/e2e/a11y.test.ts  # D4
```

When D1–D4 pass and D5 is signed off, check off `docs/audits/audit-14-checklist.md` and
delete this ledger.

## Test-isolation note

The `audit14` drivers create teachers/classes/enrollments/students and (item 4) an
`AuditLog`. Each driver cleans up in `afterAll` (audit logs by `actorUserId`, then
enrollments → class → students → users) so suites stay independent.
