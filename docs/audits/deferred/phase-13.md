# Phase 13 — Deferred Audit Ledger

**Created:** 2026-06-06
**Governing decision:** ADR 0006 (Tiered Verification Gate)

> **UPDATE 2026-06-11 — jest D1/D2 CLEARED.** The "jest hangs at bootstrap" blocker was
> root-caused and fixed (haste-map crawling `.claude/worktrees` node_modules; fixed via
> `modulePathIgnorePatterns` in `jest.config.ts`). The **full suite is now 806/806 green**,
> including `audit13/01–06` (a stale assertion in `audit13/05` 6b was corrected — blueprint
> midpoints sum to ~0.95, not ~1.0). D3 (`npm run build`) still pending in CI.
> See memory `jest-bootstrap-hang-root-cause`.

Phase 13 (Calibration Loop) closes the calibration feedback loop: admin-approved
calibration weights now drive readiness scoring (ADR 0007). This ledger records the
verification steps deferred to CI / a healthy Node environment.

## Verified locally (reliably)

- ✅ **`tsc --noEmit` → 0 errors** (run via `./node_modules/.bin/tsc` — note: `npx tsc`
  must NOT be used; it resolves to a bogus `tsc` npm package and can corrupt
  `node_modules`. Use the local bin or `npm run typecheck`).

## Deferred (run in CI / healthy env)

| # | Item | Status | Notes |
|---|------|--------|-------|
| D1 | `jest` Phase 13 drivers (`tests/integration/audit13/01–06`) + unit (`tests/unit/eoc-analytics/active-weights.test.ts`) | ⛔ Blocked locally | Same jest harness bootstrap hang as Phase 12 (see `docs/audits/deferred/phase-12.md`). Code typechecks clean. |
| D2 | Full `jest` suite (regression: prior 771+) | ⛔ Blocked locally | Run in CI. |
| D3 | `npm run build` | ⏳ Not run | Run in CI. |

## How to clear

```bash
brew link node@22   # ensure Node 22 LTS
npm ci
npx prisma generate
./node_modules/.bin/tsc --noEmit                # green
npm test                                         # D1, D2
npm run build                                     # D3
```

When D1–D3 pass, check off `docs/audits/audit-13-checklist.md` and delete this ledger.

## Test-isolation note

The `audit13` drivers create and **approve** `EocCalibrationRun` rows. Because
`getActiveWeightSource()` reads the latest approved run **globally**, each driver deletes
its run in `afterAll` so readiness-based suites (e.g. `audit10`) see the default
blueprint baseline. If those suites are reordered, confirm cleanup still runs.
