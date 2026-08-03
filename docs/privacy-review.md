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
| Activity / time-on-platform | Yes | `StudentActivitySession` | When a student was working, for how long, and which app area. **Bucketed area names only — no URLs, no page-by-page trail.** Teacher-visible, roster-scoped. See ADR 0019 |
| Student login events | Yes | `AuditLog` (`STUDENT_LOGIN`) | Genuine sign-ins only (JWT sessions mean this is not one row per visit) |
| Health/behavior/sensitive notes | **No** | — | Not modeled |
| External gradebook data | **No** | — | Internal only |
| Assessment focus events | If Focus Mode on | `AttemptIntegrityEvent` | Only during a secure assessment, only for classes that opted in. Records **that** the page lost focus and roughly for how long — **never where the student went**: no URL, no tab title, no screenshot, no keystrokes. Teacher-visible, roster-scoped, deleted with the attempt. See ADR 0020 |
| Keystroke / screen / webcam monitoring | **No** | — | Not modeled. Activity tracking records elapsed time and app area only; Focus Mode records that focus was lost, never where it went |

## 2. Privacy & security controls (spec §25.2)

- **Role-based access control.** `requireAuth(allowedRoles)` (`src/lib/auth`) gates every
  page/route; admin pages gated at `src/app/admin/layout.tsx`, teacher data roster-scoped via
  `src/lib/teacher-roster` (`assertStudentInTeacherClass`, `assertClassOwnedByTeacher`).
- **Least privilege.** Teachers see only their roster; parents (Phase 18) see only linked
  students and an allowlisted field set (`src/lib/parent-summary`).
- **Audit logging of sensitive actions.** `AuditLog` records overrides, content approval,
  accommodations, EOC score import, calibration approval, report exports
  (`REPORT_EXPORTED`), audit-log export (`AUDIT_LOG_EXPORTED`), retention purges
  (`RETENTION_PURGE`), and logins (`PARENT_LOGIN`, `STUDENT_LOGIN`). Queryable + exportable
  at `/admin/audit`.
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
- **Secure sessions.** JWT cookies signed with `SESSION_SECRET` (ADR 0002), expiring **8 hours**
  after issue (one school day — see the rationale comment on `authOptions.session`). Note the
  honest limit of a stateless session: there is no server-side revocation, so a token copied off
  a device stays valid until it expires.
- **Mock auth in production — read this carefully; the earlier one-line version of this bullet
  understated it.** There are TWO ways the one-click role login can be on, and only the first is
  closed by `NODE_ENV`:
  - `MOCK_AUTH=true` is **hard-disabled** when `NODE_ENV=production`.
  - `DEMO_OPEN_LOGIN=true` is checked **first and alone** and *does* enable one-click
    Student/Teacher/Parent/Admin login **in production**. It is a deliberate, owner-directed
    override of non-negotiable rule #8 for the public evaluation site, and is safe **only** while
    the database holds demo/seed data exclusively, because every visitor can then enter as ADMIN.
  Single source of truth: `isMockAuthEnabled()` in `src/lib/auth/demo-mode.ts`. **This variable
  must be deleted (and the app redeployed) before any real student record exists** — item 1 of the
  go-live checklist in `docs/deployment-vercel.md`, and disclosed to the district in
  `docs/district-approval-packet.md` §1.3 / §9.1.
- **HTTP security headers** are set app-side in `next.config.mjs`: CSP, HSTS,
  `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a
  `Permissions-Policy` denying camera, microphone, geolocation, and USB. The CSP's `connect-src
  'self'` is a browser-enforced backstop for rule #9 — verified live that an outbound fetch to an
  external host, an external CDN script, and a non-sanctioned iframe are all blocked while the
  `youtube-nocookie` lesson-video facade still loads. The CSP does permit inline script/style
  (framework-injected); nonce-based CSP is scheduled — see packet §9.10.
- **Activity monitoring is bounded and first-party** (ADR 0019). The heartbeat posts to this
  app's own route only — no third-party endpoint is involved (rule #9 intact). It records
  elapsed time and a **bucketed app area** (`mission`, `drill`, …); raw pathnames are never
  transmitted or stored, so there is no page-by-page browsing trail. The student is resolved
  server-side from the session cookie, never from a request parameter, so no student can log
  activity as another. Reads are roster-scoped inside the domain layer
  (`getClassSessionActivity` / `getLivePresence` both call `assertClassOwnedByTeacher`).
  Nothing about it is visible to the student — no timer, no countdown, no idle warning.
- **Activity data is NOT shared with parents.** `ParentSummaryVM` remains a strict allowlist
  (enforced by `tests/unit/parent-summary/fields-allowlist.test.ts`); time-on-task and session
  history are excluded pending an owner/district policy decision against spec §23.

## 3. Data subject rights / retention

- **Export.** Per-student, per-class, and EOC-readiness CSV exports (`/teacher/reports`,
  student profile) plus admin audit export. PDF via browser print (ADR 0008).
- **Retention.** Configurable purge of aged audit logs, voided attempts, and activity-session
  monitoring rows — see `docs/data-retention.md`. Default retains everything (conservative).
  Activity sessions are monitoring data rather than academic records, so a district may set a
  shorter window (`ACTIVITY_SESSION_RETENTION_DAYS`) without affecting any student work.
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
