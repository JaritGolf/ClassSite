# ADR 0026 — No student data: the server holds nothing about a student

- **Status:** Accepted (owner-approved plan), implemented on branch `no-student-data`
- **Date:** 2026-11-16
- **Supersedes, in whole or in part:** ADR 0002 (student sessions), 0003 (Google pending approval), 0005 (accommodation flow), 0007 (calibration loop), 0008 (parent summary), 0011 (exports and retention), 0012 (parent login), 0014 (per-student strategy overrides), 0019 (nine-week checkpoints; activity sessions), 0020 (assessment integrity), 0021 (suggestion box), 0024 (operator compliance — the duties it lists attach to student data this build no longer holds), 0025 (accommodation enforcement). The pure algorithms those ADRs describe (SM-2, off-ramp, availability, next-step ranking) are kept and now run on the device.

## Context

Palm Beach County's district office informally refused the platform because it
collects student data. The previous build held student accounts, rosters,
attempts, progress, accommodations (including ELL/ESE flags), activity
sessions, parent links and free-text suggestions. No amount of hardening
changes the fact that such data needs a district agreement.

## Decision

Build the platform so the server never receives or stores anything about a
student. Specifically:

1. **No per-student server rows of any kind, coded or pseudonymous.** A coded
   row whose key the teacher holds is still linkable student information.
2. **Students have no accounts** — no sign-in, class code, nickname, cookie or
   identifier sent to the server.
3. **Progress lives in the student's browser** (`localStorage`), with
   export/import to a file for wiped Chromebooks.
4. **Grading stays server-side but stateless.** The route receives question
   ids and answers, returns score and feedback, writes nothing.
5. **Completion codes.** On mastery the server returns a code signed with
   `SESSION_SECRET` over benchmark + score + date. Students paste it into
   Google Classroom; a teacher-only page validates codes and saves nothing.
6. **Neutral supports.** Read-aloud, sentence chunking, high contrast, large
   text and extra time are options any student can switch on, saved on the
   device with no labels. The glossary language is chosen on the device.
7. **Google sign-in for the teacher/admin only**, behind a mandatory allowlist.

## How the old guarantees were kept without stored state

| Old mechanism (stored) | New mechanism (stateless) |
|---|---|
| "Has this student passed the Readiness Check?" looked up in attempts | A signed readiness token (benchmark + date) issued on a pass and required to start and submit the Mastery Challenge |
| Republic Challenge session stored as an assessment + attempt | A signed session token over the exact question set; only a server-issued set can be graded |
| Adaptive practice state in a table | Sent by the browser with each request; the same pure transitions run client-side |
| Mastery form rotation by counting stored attempts | Round-robin by attempts recorded on the device |
| Off-ramp, unlock, SM-2 in server transactions | The same pure functions, applied to device-local progress |
| Per-question answer reveal limited by attempt ownership | Single-answer grading refuses Mastery Challenge questions; those questions are excluded from practice, drill and Republic Challenge pools |

## Consequences

**Gained:** nothing about a student is held, so there is no student data to
breach, retain, export, purge or sign an agreement over. Static guard tests
keep it that way.

**Given up — stated plainly:**

- The teacher has no view of student progress. No roster, gradebook, reports,
  interventions, decay or calibration dashboards, parent view.
- The server cannot count attempts. A student can retake any assessment; form
  rotation and the single Final Trial attempt are honoured by the device and
  can be defeated by clearing it. A determined student can also edit their own
  local progress. The completion code is still unforgeable — it is only issued
  by a server-graded pass.
- A completion code proves a mission was mastered, not who mastered it. Codes
  can be shared, and identical results on the same day produce identical codes.
- Readiness tokens name a benchmark, not a person, and can be shared.
- Progress is lost with the device unless the student saved a file.
- EOC score import and readiness calibration are gone: they needed real scores.
- Teacher-assigned supports are gone; "reduced answer choices" is removed
  entirely because it cannot be done without the server knowing who asked.
- Class-scoped lesson arrangements still exist, but students are not in
  classes, so every student sees the arrangement of the teacher's first class.

## Residual facts a reviewer should know

Recorded in `docs/privacy-review.md`: routine hosting access logs (IP, time,
path) exist as on any website; a clicked lesson video contacts YouTube's
privacy-enhanced player; teacher-authored content must not contain student
names. None of these is stored by the application.

## Enforcement

`tests/unit/guards/no-student-data.test.ts` (schema allowlist, transitive
route and page scans, request-schema scan, deleted-path list), plus row-count
assertions in `tests/integration/stateless-*.test.ts`.
