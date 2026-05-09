# Civics Quest — Architecture Notes

This document is updated at each phase boundary per spec Section 35.5.

---

## Phase 0 — Project Setup (2026-05-09)

### Stack

| Layer | Technology | Rationale |
|---|---|---|
| Framework | Next.js 14 (App Router) | Spec-mandated. Server components enable server-side grading. |
| Language | TypeScript 5 | Spec-mandated. Full strict mode. |
| Styling | Tailwind CSS 3 | Spec-mandated. |
| ORM | Prisma 5 | Spec-mandated PostgreSQL access. Type-safe schema. |
| Database | PostgreSQL 16 | Spec-mandated (spec Rule 8). |
| Auth | next-auth v4 | Spec-mandated: Clever-first, Google fallback, mock for dev. |
| Validation | Zod | Env-var validation on boot + API request parsing. |
| Testing | Jest + Playwright | Unit/integration + E2E. |

### Key Decisions

- **App Router over Pages Router:** Required for server-side rendering patterns needed by server-side grading (spec Rule 1) and answer-key isolation (spec Rule 2).
- **PostgreSQL local via Homebrew:** Developer choice (2026-05-09). No Docker or hosted DB. Reversible — any PostgreSQL 14+ instance will work.
- **next-auth v4:** Stable, well-documented, supports Clever OAuth and Google OAuth out of the box. Evaluate upgrade to v5/Auth.js at Phase 2 implementation.

### ADRs

See `docs/adrs/` directory. None yet — first non-trivial decisions expected at Phase 1 (schema) and Phase 2 (auth).

---

*Updated at phase boundaries per spec Section 35.5.*
