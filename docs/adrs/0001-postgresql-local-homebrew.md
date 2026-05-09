# ADR 0001 — Local PostgreSQL via Homebrew

**Date:** 2026-05-09  
**Status:** Accepted  
**Phase:** 0

---

## Context

The spec mandates PostgreSQL (spec Rule 8 and Section 2.2). PostgreSQL was not installed on the development machine. Three options were evaluated:

1. **Homebrew local install** — `brew install postgresql@16`
2. **Docker-based local PG** — requires Docker Desktop
3. **Hosted dev database** — Railway / Supabase / Neon free tier

## Decision

Option 1: **Homebrew PostgreSQL 16.13** on the local machine.

## Rationale

- Fastest path to unblocking Phase 1 — single command, no additional tools required.
- Fully offline — no student data leaves the machine even in development.
- Free and zero ongoing cost.
- Consistent with spec Rule 9 (no PII in external systems) applied conservatively to dev data as well.
- Docker Desktop would require a separate installation (~500 MB) with no added value for a solo developer.
- Hosted dev DBs introduce a network dependency and potential data-residency concerns for a school project (even dev/seed data).

## Consequences

- Development environment requires Homebrew on macOS (Apple Silicon). CI/staging must use a different provisioning path.
- When a second developer joins, they run the same `brew install postgresql@16` setup step.
- Reversible: any PostgreSQL 14+ instance (Docker, hosted, etc.) can be substituted by changing `DATABASE_URL` in `.env.local`.

## Notes

Installed version: PostgreSQL 16.13 (Homebrew), arm64-apple-darwin25.2.0.
