# ADR 0003 — Google OAuth Role Assignment: Pending Admin Approval

**Date:** 2026-05-14
**Status:** Accepted
**Phase:** 2

## Context

Google OAuth is the fallback sign-in method for staff/teachers who do not have Clever SSO.
Unlike Clever, Google does not provide a user type (`student`/`teacher`) in the OAuth response.
A role must be assigned at sign-in time.

## Decision

New Google OAuth users are created with `role: 'TEACHER'` and `status: 'INACTIVE'`.
They cannot access the app until an admin explicitly activates them in `/admin/users`.

## Rationale

- Google accounts could belong to anyone — students, parents, external parties.
  Assigning TEACHER immediately would be a privilege escalation risk.
- INACTIVE prevents sign-in but preserves the DB record for admin review.
- No new `UserStatus` value is needed — `INACTIVE` already exists in the schema.
- The sign-in flow returns `/login?error=pending-approval` for INACTIVE users,
  which renders a clear "contact your administrator" message.
- Admins activate users by setting `status: 'ACTIVE'` in `/admin/users` (Phase 9).

## Consequences

- Google sign-in requires a second DB lookup in the `signIn` callback to check status.
- First-time Google sign-in always fails with a "pending approval" message.
- Admin must actively manage Google user activation — adds operational overhead.
- Returning users (already ACTIVE) sign in immediately without interruption.

## Alternatives Considered

- **Auto-assign TEACHER on first sign-in**: Simpler, but opens the door to role escalation
  by anyone with a Google account. Rejected as unsafe for a student platform.
- **Ask user for role at sign-in**: UX friction; requires additional UI state. Deferred to
  a future phase if needed.
- **Restrict Google OAuth to specific email domain (e.g., @palmbeachschools.org)**: Better
  long-term but requires district IT confirmation of the exact domain list. Can be added to
  `options.ts` `signIn` callback as `if (!user.email?.endsWith('@domain')) return false`.
  Noted here as a recommended Phase 17 hardening step.
