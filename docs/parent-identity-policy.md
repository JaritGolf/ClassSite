# Parent Identity-Verification Policy (Phase 18)

> Audit §36.19 item 1 / spec §37. This is the **configurable district gate** for parent
> login. The code ships behind `FEATURE_PARENT_PORTAL` (default off); this document defines
> the policy an admin follows before marking a parent↔student link **VERIFIED**. **Owner /
> district to fill in and confirm before enabling the portal.**

## How parent login works (admin-mediated, district-safe)

1. An **admin** creates the parent account by email (`/admin/parents`). The parent then signs
   in with **Google** (email match) — no self-service signup, no new identity provider.
2. The admin **links** the parent to their student(s); the link starts **PENDING** and shows
   **no data**.
3. The admin **verifies** the link (sets **VERIFIED**) only after confirming the parent's
   identity and relationship per the policy below. Only VERIFIED links surface progress.
4. Setting `FEATURE_PARENT_PORTAL=true` enables parent login + the dashboard.

This keeps identity verification a **staff action** — the conservative reading of "respects
district verification policy" — without building a self-service identity flow.

## Policy to confirm with the district (fill in)

- [ ] Who qualifies as a "parent/guardian" eligible for an account?
- [ ] What proof must an admin see before setting a link **VERIFIED** (e.g. enrollment record,
      government ID, district SIS match, signed form)?
- [ ] Who at the school/district is authorized to perform verification (which admin users)?
- [ ] How are relationship values recorded / constrained (mother, father, guardian, …)?
- [ ] Retention/disclosure rules for parent account data (ties into `docs/data-retention.md`
      and `docs/privacy-review.md`).
- [ ] Process to **REJECT** / revoke a link if a relationship changes.

## What a verified parent can and cannot see

- **Sees** (allowlist VM, identical to the teacher-shared summary): current mission, mastered
  benchmarks, needs-review, remediation status, recent assessment summary (score + pass/fail +
  date only), EOC readiness summary, suggested at-home review, positive indicators.
- **Never sees**: answer keys, the item bank, item-level / distractor analysis, **other
  students**, private teacher notes, confidence-calibration data, internal flags
  (decay/overrides/accommodations). Enforced by the allowlist VM + forbidden-field tests
  (`tests/integration/audit18/03`).

## Audit

Every provisioning and verification action is audit-logged
(`PARENT_ACCOUNT_CREATED`, `PARENT_LINK_CREATED`, `PARENT_LINK_STATUS_CHANGED`), and each
parent sign-in writes `PARENT_LOGIN` (audit §36.19 item 4). Reviewable at `/admin/audit`.
