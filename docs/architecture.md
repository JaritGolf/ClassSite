# My Civics Class — Architecture Notes

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

### Phase 17 — District Readiness

- **Exports** (`src/lib/export/`): hand-rolled RFC-4180 CSV (`csv.ts`, no library) + report
  builders (`reports.ts`) composing existing analytics into column-allowlisted CSVs. PDF =
  browser `window.print()` (ADR 0008). Routes: `/api/admin/audit/export`,
  `/api/teacher/reports/export`, `/api/teacher/students/[id]/report/export`.
- **Audit viewer**: `/admin/audit` over `listAuditLogs`; export via `exportAuditLogsCsv`.
- **Retention** (`src/lib/retention/`): env-configurable thresholds (`policy.ts`) + purge
  runner (`purge.ts`) for aged audit logs and voided attempts. Admin UI `/admin/retention`,
  API `POST /api/admin/retention/purge`, script `npm run retention:purge`. No cron deployed.
- **Audit-log catalog additions**: `REPORT_EXPORTED`, `AUDIT_LOG_EXPORTED`, `RETENTION_PURGE`.
- See ADR 0011 and `docs/{privacy-review,hosting-plan,oauth-scopes,data-retention}.md`.

### Phase 18 — Parent Login

- **Parent portal** (`src/lib/parent-portal/`): `feature.ts` (`isParentPortalEnabled`),
  `authorize.ts` (verified-link gate, `ParentAccessError`), `summary.ts`
  (`getParentSummaryForParent` → reuses the extracted `buildParentSummaryVM`), `admin.ts`
  (admin provisioning: create/link/verify), `login.ts` (`recordParentLoginEvent`).
- **Admin-provisioned, flag-gated** (ADR 0012); only VERIFIED `ParentStudentLink`s show data.
- Pages: real `/parent/dashboard` + `/parent/students/[id]` (shared `ParentSummaryView`,
  extracted from the Phase 14 teacher page); admin `/admin/parents` + `/api/admin/parents/*`.
- NextAuth `events.signIn` writes `PARENT_LOGIN`. Audit-log catalog +4 (PARENT_LOGIN,
  PARENT_ACCOUNT_CREATED, PARENT_LINK_CREATED, PARENT_LINK_STATUS_CHANGED). Schema-free.

### ADRs

See `docs/adrs/` directory (0001–0021).

> **Note:** the sections above cover Phase 0 plus Phases 17–18 only. Phases 13–16 and the
> post-Phase-18 work (ADRs 0013–0021 — content approval mode, strategy tracking, rich media,
> explainer hovers, standards realignment, visual stimuli, activity sessions, assessment
> integrity, suggestion box) are documented in their ADRs and in `CLAUDE.md`, not here. This
> file is behind; the ADRs are authoritative.

---

*Updated at phase boundaries per spec Section 35.5.*
