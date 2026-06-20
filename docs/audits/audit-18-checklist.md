# Audit 18 — Parent Login (§36.19)

Phase 18 ships parent login behind `FEATURE_PARENT_PORTAL` (default off), admin-provisioned,
with verification as a staff action (ADR 0012). The district-policy item is owner-pending and
does not block the tag (ADR 0006).

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Parent account creation flow respects district verification policy | ✅ Code + ⏳ policy | Admin-only provisioning (`src/lib/parent-portal/admin.ts`, `/admin/parents`); links default PENDING; VERIFIED is a staff action. Policy doc `docs/parent-identity-policy.md` — **district sign-off pending**. Driver: `audit18/01`. |
| 2 | Linked-student dashboard shows only permitted fields | ✅ Code | Reuses the Phase 14 allowlist VM via `getParentSummaryForParent` + shared `ParentSummaryView`. Drivers: `audit18/02`, `audit18/03`. |
| 3 | Parent cannot access answer keys, item-level analysis, other students, calibration | ✅ Code | Allowlist VM + verified-link scope (`assertParentCanViewStudent`); non-linked → `NOT_LINKED`. Forbidden-token guard: `audit18/03`. |
| 4 | Audit log captures parent login events | ✅ Code | `recordParentLoginEvent` (NextAuth `events.signIn`) writes `PARENT_LOGIN`. Driver: `audit18/04`. |

## Verification (tiered gate, ADR 0006)

- **Tier 1 (blocking):** `./node_modules/.bin/tsc --noEmit` → 0 errors.
- **Tier 2 (blocking):** `npm test` → full suite **934/934 green** (111 suites), incl.
  `audit18/01–04` + `tests/unit/parent-portal/feature`.
- **Tier 3 (non-blocking, deferred):** `npm run build`; axe e2e on `/parent/dashboard` +
  `/parent/students/[id]`; manual a11y — see `docs/audits/deferred/phase-18.md`.

## Owner actions to fully close audit 18

1. Confirm the district parent-identity-verification policy and complete
   `docs/parent-identity-policy.md` (item 1).
2. Set `FEATURE_PARENT_PORTAL=true` only after that sign-off.
3. Manual a11y pass on the parent pages.
