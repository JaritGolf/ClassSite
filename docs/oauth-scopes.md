# My Civics Class — OAuth Scopes Inventory (Phase 17)

> Audit §36.18 item 5. Inventories the exact OAuth scopes the app requests so the owner can
> verify them against Palm Beach County School District policy. **Verification against
> district policy is an owner action (spec §37).**

## Clever (primary SSO)

Config: `src/lib/auth/providers/clever.ts`.

| Scope | Why requested | Data accessed |
|---|---|---|
| `read:user_id` | Identify the authenticated user to link the account | The Clever user id, user type, and district id — nothing else |

**This is the complete list. One scope.**

> **Changed 2026-08-07 — narrowed.** The app previously requested `read:students` and
> `read:teachers` as well, for a name lookup that was never implemented. The only Clever
> endpoint this app calls is `/v3.0/me`, which returns `{ id, type, district }` and is covered
> by `read:user_id` alone; user names are currently written as the literal `"Clever User"`
> (`src/lib/auth/options.ts`). Requesting scope that is never exercised conflicts with
> Fla. Stat. § 1006.1494(3)(a) ("collect no more covered information than is reasonably
> necessary") and is the kind of mismatch a district Legal review looks for. **If the name
> lookup is built, restore the scope in the same commit as the API call — not before.**

Production redirect URI: `https://mycivicsclass.com/api/auth/callback/clever`. This must be
registered as an allowed redirect in the Clever app settings and match
`CLEVER_REDIRECT_URI` exactly, or production sign-in fails.

Notes:
- Clever does **not** support PKCE; the flow uses `state` only (`checks: ['state']`).
- The app reads identity from `/v3.0/me` only. It does **not** call the students/teachers
  detail endpoints, and does **not** request sections/courses/contacts/financials.
- Net effect: **no student name or email reaches the database via Clever.** The only
  Clever-derived identifiers stored are the opaque `cleverId` and the role implied by `type`.

## Google (staff fallback)

Config: `src/lib/auth/options.ts` (NextAuth GoogleProvider).

| Scope | Why requested | Data accessed |
|---|---|---|
| `openid`, `email`, `profile` (provider default) | Staff sign-in identity | Email, name, profile picture |

Production redirect URI: `https://mycivicsclass.com/api/auth/callback/google`;
`mycivicsclass.com` must be an authorized domain on the Google OAuth client.

Notes:
- No additional Google API scopes (Classroom, Drive, Directory) are requested.
- New Google users are created **INACTIVE** and must be activated by an admin (ADR 0003);
  default role TEACHER.

## District verification checklist (owner action)

- [ ] Confirm Clever app is approved by the district and that `read:user_id` is within the
      district-allowed set.
- [ ] Confirm whether Google OAuth is permitted for staff, and that no broader scopes are
      required/forbidden.
- [ ] Confirm the redirect URIs registered with each provider match the approved hosting
      domain.
- [ ] Record the district's decision and any scope changes back into this file.
