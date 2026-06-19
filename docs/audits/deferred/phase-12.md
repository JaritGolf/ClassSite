# Phase 12 — Deferred Audit Ledger

**Created:** 2026-06-06
**Governing decision:** ADR 0006 (Tiered Verification Gate)
**Phase tagged complete on:** Tier 1 code signal (`tsc --noEmit` = 0 errors) + full
Phase 12 implementation landed across `feat(phase-12a..d)`.

> **UPDATE 2026-06-11 — jest blocker CLEARED.** The "jest hangs at bootstrap" issue (D1)
> was root-caused and fixed (haste-map crawling `.claude/worktrees` node_modules; fixed via
> `modulePathIgnorePatterns` in `jest.config.ts`). The **full suite is now 806/806 green**.
> The Phase 12 jest items (D1) pass as part of that suite. Remaining Phase 12 deferred items
> are Tier-3 only: `next build` (D2), axe e2e (D3), manual a11y/VoiceOver (D4–D7).
> See memory `jest-bootstrap-hang-root-cause`.

> **UPDATE 2026-06-19 — D2 + D3 CLEARED.**
> - **D2 `npm run build`** → ✅ PASS (exit 0; "Compiled successfully", 75 pages). Needed one
>   env fix: `.next` was a dangling symlink to a deleted `.next.nosync` target — recreated the
>   target dir (the macOS cloud-sync-exclusion convention). No code change for the build itself.
> - **D3 axe e2e** → ✅ PASS. `tests/e2e/a11y.test.ts` (student dashboard/mission/assessment/
>   settings) reports **zero WCAG 2.0/2.1 A/AA violations**. Fixing this surfaced (and fixed)
>   real `color-contrast` failures — `text-gray-400` on light backgrounds in the nav sign-out
>   buttons, mission `StepIndicator`/benchmark code, settings/assessment loaders — bumped to
>   `text-gray-600` and removed an `opacity-70` dim on inactive steps.
>   - Harness fixes required to run it at all: `global-setup.ts` posted to the wrong NextAuth
>     callback (`/credentials` → `/mock-credentials`) so e2e auth never worked; `test:e2e`
>     now loads `.env.local`; Playwright timeouts raised for this machine's slow on-demand
>     compile; chromium reinstalled.
> - **D4–D7 manual a11y** (keyboard-only, VoiceOver, 200% zoom, color-only) remain
>   **owner-attested** — not machine-runnable, not self-certified.

This ledger records the verification steps that are **outstanding** for Phase 12 and the
**honest reason** each could not be completed on the build machine. Per ADR 0006 these are
**non-blocking** for starting Phase 13, but must be cleared (with owner sign-off) in a
healthy environment / CI before any release or district pilot.

---

## What IS verified (locally, reliably)

- ✅ **`tsc --noEmit` → 0 errors.** Full type-level verification of all Phase 12 code.
  Run repeatedly this session; green every time.
- ✅ **Toolchain repaired.** Node pinned to 22 LTS (was Node 26, ABI-mismatched with
  Next 14); `node_modules` clean-reinstalled via `npm ci` (498M, complete); the
  previously-corrupt 114MB Next SWC binary is now intact (113M on disk); `prisma generate`
  clean; Postgres up; migrations applied (`Database schema is up to date!`).

## What is DEFERRED (could not run on this machine)

| # | Item | Status | Reason / Notes |
|---|------|--------|----------------|
| D1 | **`jest` full suite** (unit + integration) | ⛔ Blocked locally | The jest harness **hangs at bootstrap on this machine** — a single pure, no-DB test with `--forceExit` produced zero output in 40s; the process is reaped before any test runs. This is environment-level (jest/ts-jest bootstrap), NOT a code defect: the same suite ran **771 passing tests on 2026-05-29** before the environment degraded, and `tsc` passes now. **Must be run in CI / a healthy Node environment.** `isolatedModules: true` was added to `jest.config.ts` (transpile-only) to remove the type-check cost and help future runs. |
| D2 | **`npm run build`** (production `next build`) | ⏳ Not yet run | Deferred with the jest blocker; toolchain is now repaired so this should run, but was not executed to keep the unblock focused. Run in CI alongside D1. |
| D3 | **axe e2e** (`tests/e2e/a11y.test.ts`) | ⏳ Not yet run | Needs dev server + jest/playwright harness; deferred with D1/D2. WCAG 2.1 AA automated check on dashboard/mission/assessment/settings. |
| D4 | **Manual a11y — keyboard-only mission** (audit-12 item 2) | ⏳ Owner | Browser-driven; do once dev server runs in a healthy env. |
| D5 | **Manual a11y — VoiceOver / screen reader** (item 3) | ⏳ Owner | Genuinely manual attestation; owner to verify. |
| D6 | **Manual a11y — 200% zoom** (item 10) | ⏳ Owner | Browser-driven. |
| D7 | **Manual a11y — no color-only indicators** (item 9) | ⏳ Owner | Visual scan of dashboard / assessment result / teacher tables / question bank. |

## How to clear this ledger (in CI or a healthy local env)

```bash
nvm use            # or: brew link node@22  — ensure Node 22 LTS
npm ci
npx prisma generate && npx prisma migrate deploy
npx tsc --noEmit                                   # already green
npx jest --config jest.config.ts                   # D1
npm run build                                       # D2
npm run dev & npx playwright test tests/e2e/a11y.test.ts   # D3
# D4–D7: manual per docs/audits/audit-12-checklist.md
```

When D1–D3 pass and D4–D7 are signed off, delete this ledger and check off
`docs/audits/audit-12-checklist.md`.
