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
- **Audit-log catalog additions**: `REPORT_EXPORTED`, `AUDIT_LOG_EXPORTED`, `RETENTION_PURGE`,
  and (ADR 0024) `STUDENT_DISENROLLED`, `STUDENT_RECORDS_PURGED`.
- **Statutory deletion (ADR 0024)**: `src/lib/retention/student-records.ts` implements
  Fla. Stat. § 1006.1494(3)(c) — an administrator records district notice of disenrollment
  (`Student.deactivatedAt`), and the purge deletes that student's records within 90 days.
  Capped at 90; cannot be configured longer.
- See ADR 0011, ADR 0024, and
  `docs/{privacy-review,hosting-plan,oauth-scopes,data-retention,florida-operator-compliance,tch-contingency}.md`.

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

### Nine-Week Progress Checkpoints (ADR 0019)

- **Progress checkpoints** (`src/lib/progress-checkpoints/`): `levels.ts` (pure — prefix
  level rule, strict target monotonicity, `endOfSchoolDayUtc` in America/New_York),
  `config.ts` (plan/checkpoint/target read+write, two-stage validation, roster IDOR guard
  in the domain layer), `student-level.ts` (live + locked views, checkpoint map markers),
  `snapshot.ts` (lazy locking via `createMany({skipDuplicates})`).
- **Schema** (migration `20260724120000_progress_checkpoints`, additive): `ProgressPlan`
  (`@@unique([teacherId, schoolYear])`), `ProgressCheckpoint`, `ProgressCheckpointTarget`,
  `StudentCheckpointLevel` (`targetsJson` freezes the targets behind a locked level),
  + nullable `Class.progressPlanId`. Called "checkpoint" because `Class.period` already
  means bell-schedule period.
- **Levels never gate content.** Enforced by a static guard,
  `tests/integration/progress-checkpoints/no-gating.test.ts`: no access-deciding module
  (`lib/mastery`, `lib/assessment`, `lib/spaced-retrieval`, `lib/adaptive-difficulty`,
  the mission page, assessment routes) may import this module, and this module never
  writes `StudentProgress`.
- **No grade vocabulary on any surface** — and no "this is not a grade" disclaimer either
  (ADR 0019 decision 1).
- Teacher: `/teacher/classes/[classId]/progress-targets`, `CheckpointLevelTable` on the
  dashboard, CSV export (bare-integer Level column). Analytics entry point is
  `getCheckpointLevelsForTeacher` in `class-analytics` — per-class, unlike the rest of
  that module which flattens the roster.
- Student: `CheckpointCard` on the dashboard, checkpoint flags on map target nodes.
- Parent: allowlisted `progressCheckpoints` on `ParentSummaryVM`, rendered by the shared
  `ParentSummaryView` (parent dashboard + parent student page + teacher printable summary).
  **Two** pinned allowlists gate additions: `PARENT_SUMMARY_FIELDS` and the separate
  `ALLOWED_KEYS` in `tests/integration/audit18/03-forbidden-fields.test.ts`.
- Audit-log catalog +2: `PROGRESS_TARGETS_UPDATED` (exported as
  `PROGRESS_CHECKPOINT_AUDIT_ACTIONS`) and `BENCHMARK_READINESS_SET`; CSV export reuses
  `REPORT_EXPORTED`.
- **Progression fixes shipped alongside:** cross-unit + content-aware
  `unlockNextBenchmark`, `lib/mastery/availability.ts`, and write-once `masteredAt`.
- **`lib/mastery/availability.ts` is the single definition of what a student may open.**
  It keys on a GRANTED/TERMINAL **status allowlist**, deliberately NOT on whether a
  `StudentProgress` row exists. `POST /api/mission/progress` upserts a row on any visit,
  so a row-existence rule is self-widening — visiting a locked mission would permanently
  unlock it. `IN_PROGRESS` is excluded because it is written only on that upsert's create
  branch. Playability additionally requires the teacher-controlled
  `Benchmark.readyForStudents` flag (`/teacher/benchmarks`), an approved Mastery Challenge
  with questions, and an approved lesson — see `PLAYABLE_BENCHMARK_WHERE`.
  ⚠ Known, fail-safe divergence: `unlockNextBenchmark`'s own reachability check does not
  include the ready flag or the lesson requirement, so it can write a grant row for a
  benchmark the map renders as `COMING_SOON`. The read path is stricter, so the student
  cannot open it either way.

### ADRs

See `docs/adrs/` directory (0001–0021).

> **Note:** the sections above cover Phase 0 plus Phases 17–18 only. Phases 13–16 and the
> post-Phase-18 work (ADRs 0013–0021 — content approval mode, strategy tracking, rich media,
> explainer hovers, standards realignment, visual stimuli, activity sessions, assessment
> integrity, suggestion box) are documented in their ADRs and in `CLAUDE.md`, not here. This
> file is behind; the ADRs are authoritative.

---

*Updated at phase boundaries per spec Section 35.5.*
