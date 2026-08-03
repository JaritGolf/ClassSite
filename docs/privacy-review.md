# My Civics Class — Privacy Review (Phase 17)

> Audit §36.18 item 3. Maps spec §25 (Data, Privacy, and District Readiness) to the
> implementation. This document is the basis for district privacy sign-off before any
> real student account is used. **Owner must obtain district review (spec §37) before
> production.**

## 1. Data we store (spec §25.1)

| Data category | Stored? | Where | Notes |
|---|---|---|---|
| Student Clever/Google ID | Yes | `User.cleverId` / `User.googleId` | Account link only |
| Student name | Yes | `User.firstName/lastName` | Roster display |
| Class / period / teacher | Yes | `Class`, `ClassEnrollment`, `Teacher` | Dashboards |
| Assessment attempts | Yes | `AssessmentAttempt` | Mastery/progression |
| Item responses | Yes | `AttemptResponse` | Remediation diagnostics |
| Confidence ratings | Yes | `AttemptResponse.confidence` | Calibration |
| Spaced retrieval state | Yes | `SpacedReviewState` | Per (student, benchmark) |
| EOC readiness metrics | Yes | derived / `EocReadinessSnapshot` | Computed |
| Actual EOC scores | Conditional | `EocActualScore` | **Admin only, consent-gated** (`consentAcknowledged`) |
| Parent/guardian data | If portal enabled | `Parent`, `ParentStudentLink` | Auth + linking only (Phase 18) |
| Health/behavior/sensitive notes | **No** | — | Not modeled |
| External gradebook data | **No** | — | Internal only |

## 2. Privacy & security controls (spec §25.2)

- **Role-based access control.** `requireAuth(allowedRoles)` (`src/lib/auth`) gates every
  page/route; admin pages gated at `src/app/admin/layout.tsx`, teacher data roster-scoped via
  `src/lib/teacher-roster` (`assertStudentInTeacherClass`, `assertClassOwnedByTeacher`).
- **Least privilege.** Teachers see only their roster; parents (Phase 18) see only linked
  students and an allowlisted field set (`src/lib/parent-summary`).
- **Audit logging of sensitive actions.** `AuditLog` records overrides, content approval,
  accommodations, EOC score import, calibration approval, report exports
  (`REPORT_EXPORTED`), audit-log export (`AUDIT_LOG_EXPORTED`), and retention purges
  (`RETENTION_PURGE`). Queryable + exportable at `/admin/audit`.
- **Answer keys never exposed.** Question option `isCorrect`/`feedback` are deliberately
  omitted from student-facing assessment payloads (`src/lib/assessment/question-fetcher.ts`);
  report exports are column-allowlisted and never include item-level/distractor data
  (enforced by `tests/integration/audit17/02`).
- **No third-party analytics/telemetry on student data** (non-negotiable rule #9). No GA,
  Segment, Mixpanel, Hotjar, FullStory, Sentry-browser, etc. Enforced by a static guard test
  (`tests/integration/audit17/04`).
- **No PII in URLs/query strings.** Exports deliver data in the response body with a
  `Content-Disposition` filename; audit-log filters use non-PII params only.
- **Encryption in transit (TLS 1.2+).** Provided by the hosting/ingress layer — see
  `docs/hosting-plan.md`. **Encryption at rest** is a hosting/database responsibility — see
  hosting plan.
- **Secure sessions.** JWT cookies signed with `SESSION_SECRET` (ADR 0002); `MOCK_AUTH`
  hard-disabled when `NODE_ENV=production`.

## 3. Data subject rights / retention

- **Export.** Per-student, per-class, and EOC-readiness CSV exports (`/teacher/reports`,
  student profile) plus admin audit export. PDF via browser print (ADR 0008).
- **Retention.** Configurable purge of aged audit logs and voided attempts — see
  `docs/data-retention.md`. Default retains everything (conservative).
- **Deletion.** Account deletion cascades from `User` (Prisma `onDelete: Cascade` on
  Student/Teacher/Parent). District-initiated bulk deletion is operational — see runbook.

## 4. Compliance references (spec §References)

- FERPA — https://studentprivacy.ed.gov/ferpa
- Clever student-data privacy — https://support.clever.com/hc/s/articles/202393058

## 5. Outstanding for district sign-off (spec §37)

- [ ] District privacy/vendor agreement executed.
- [ ] Hosting & at-rest encryption approved (`docs/hosting-plan.md`).
- [ ] Clever/Google OAuth scopes approved (`docs/oauth-scopes.md`).
- [ ] Retention windows set per district policy (`AUDIT_LOG_RETENTION_DAYS`, etc.).
- [ ] Parent identity-verification policy confirmed before Phase 18.
