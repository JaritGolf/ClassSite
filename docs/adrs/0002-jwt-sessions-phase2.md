# ADR 0002 — JWT Session Strategy for Phase 2

**Date:** 2026-05-14
**Status:** Accepted
**Phase:** 2

## Context

next-auth v4 supports two session strategies: JWT (default, stateless) and database sessions
(stateful, requires an adapter and a `Session` table). Phase 2 introduces auth for the first time.

## Decision

Use **JWT session strategy** (`session: { strategy: 'jwt' }`).

## Rationale

- No `@auth/prisma-adapter` installation required; no `Session` table needed; no DB schema migration.
- JWT is the next-auth default when no adapter is configured — lowest friction path.
- `role` and `userId` are embedded in the encrypted, httpOnly JWT cookie on sign-in and read on
  every subsequent request without a DB lookup.
- The JWT is signed and encrypted with `SESSION_SECRET` (per spec) — tamper-proof.
- Reversible at Phase 3 if the adapter is later needed (e.g., for session invalidation, multi-device
  token revocation, or DB-backed session expiry). To switch: install adapter, add `sessions` and
  `accounts` tables, change `strategy: 'database'`.

## Consequences

- No server-side session invalidation without a separate token blocklist (not needed until Phase 4+).
- JWT cookie size is bounded by the fields stored in it (`userId`, `role`, `name`, `email`, `image`).
  Do not add large objects to the token.
- If a user's role changes in the DB, their JWT reflects the old role until next sign-in.
  For Phase 2, role changes happen only via admin; a sign-out/sign-in cycle is acceptable.

## Alternatives Considered

- **Database sessions via `@auth/prisma-adapter`**: More overhead to set up; adds `Session`,
  `Account`, `VerificationToken` tables to the schema; requires a migration. Preferred if
  server-side invalidation becomes critical in a later phase.
