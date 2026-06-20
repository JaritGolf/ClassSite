# ADR 0012 — Parent Login: Admin-Provisioned, Flag-Gated

**Status:** Accepted
**Date:** 2026-06-19
**Phase:** 18 (§36.19 / spec §23 Phase 2)

## Context

Phase 18 adds real parent login (parent portal "Phase 2"). The spec gates this on district
parent-identity-verification policy, which the owner cannot confirm now and does not want to
block the build (memory `district-verification-deferred`). We need a parent login that is
shippable now, safe by default, and that doesn't require building a self-service identity flow
(the exact piece the district must define).

## Decisions

1. **Admin-provisioned, no self-signup.** An admin creates the parent account by email
   (`/admin/parents`), links it to student(s), and verifies the link. Parents authenticate via
   the existing **Google** provider (email match) or **mock** (dev). This works *because*
   `upsertUserFromSignIn` upserts Google users by email and new Google users default to
   TEACHER/INACTIVE — a parent can only get a PARENT role if an admin pre-creates the User. So
   admin provisioning is both the safe choice and the natural one.

2. **`FEATURE_PARENT_PORTAL` gates everything (default off).** Mirrors `FEATURE_L1_GLOSSES`.
   When off, `/parent/*` shows a "not available" state and parents see no data. Admins can
   still provision/verify ahead of enabling. Flip to `"true"` after district sign-off.

3. **Only VERIFIED links surface data.** `ParentStudentLink.verifiedStatus` (PENDING default)
   is the in-app identity gate. PENDING/REJECTED and non-linked students return nothing
   (`ParentAccessError`). The district policy for *when* an admin may set VERIFIED lives in
   `docs/parent-identity-policy.md` (owner-pending).

4. **Reuse the Phase 14 allowlist VM.** `getParentSummary` (teacher) and the new
   `getParentSummaryForParent` (verified-link) both call the extracted `buildParentSummaryVM`.
   Rendering is shared via `ParentSummaryView`. The VM already excludes answer keys /
   item-level / calibration; the parent path adds parent-scope authorization.

5. **Schema-free, no new deps.** `Parent`, `ParentStudentLink`, `ParentVerifiedStatus` already
   existed. The login-audit logic is extracted to `recordParentLoginEvent` (called from
   NextAuth `events.signIn`) so it is unit-testable.

## Consequences

- Parent login can ship and be exercised in dev now; production stays dark until the flag is
  set after district sign-off — no build blockage.
- Audit-log catalog additions: `PARENT_LOGIN`, `PARENT_ACCOUNT_CREATED`, `PARENT_LINK_CREATED`,
  `PARENT_LINK_STATUS_CHANGED`.
- `FEATURE_PARENT_PORTAL` is now wired (was a reserved stub).
- A future self-service parent signup (if the district allows) can layer on without changing
  the verified-link data gate.
