# ADR 0019 — Student Activity Sessions

**Date:** 2026-07-30
**Status:** Accepted
**Context phase:** Phase 9 (Teacher LMS) extension

## Context

The owner needed to see, per student: **when they logged on, how long they were
working, and how much progress they made in that session.**

The platform could answer none of these. An audit of the schema and auth layer
found:

- No session, login, presence, or heartbeat model existed for students. There
  are no NextAuth `Session`/`Account` tables either — there is no DB adapter.
- The only persisted "last seen" signal was `StreakState.lastActiveDate`, a
  `@db.Date` column (time truncated by Postgres) on a single row per student
  that overwrites itself. No history, no time of day, no duration.
- Duration was not derivable. `AttemptResponse.timeSeconds` exists but no client
  has ever sent it, so it is null in every row. Reading a lesson leaves no
  server-side trace at all: `POST /api/mission/progress` writes
  `StudentProgress.currentStepId` with no timestamp.
- Only graded work carries timestamps: `AssessmentAttempt.startedAt/submittedAt`,
  `SpacedReviewEvent.occurredAt`, `StudentProgress.masteredAt`,
  `StudentRemediation.completedAt`, `StudentBadge.awardedAt`.
- No timestamp column in the schema was indexed apart from
  `SpacedReviewState.dueAt`.

So this needed new instrumentation, not a new query.

## Decisions

### 1. Sessions are activity-driven, not auth-driven

The first activity after a gap of `SESSION_GAP_MINUTES` (15) opens a new
session; anything sooner extends the current one.

The tempting alternative was to hang sessions off NextAuth's `events.signIn`,
which already exists and is already used for `PARENT_LOGIN`. **That does not
work here.** `src/lib/auth/options.ts` uses `session: { strategy: 'jwt' }` with
no database adapter, so `events.signIn` fires only on a genuine credential or
OAuth sign-in. A student who returns the next morning with a valid cookie fires
nothing. A login-event-driven design would have reported one "login" per month
per student.

`events.signIn` is still wired — it writes a `STUDENT_LOGIN` audit row and sets
`StudentActivitySession.startedByLogin` — so a real authentication is
distinguishable from resumed work. But it is not the source of truth for "when
did they start working today."

**Consequence for the UI:** the teacher-facing column is labeled "Started", not
"Logged in", and its explainer hover says so explicitly. Reporting a resumed
session as a login would be a quiet lie to a teacher who may act on it.

We deliberately did **not** shorten the JWT `maxAge` to force more frequent
re-authentication. Making 7th graders re-enter credentials daily to improve a
report is the wrong trade, and activity-driven sessioning makes it unnecessary.

### 2. "Active time" accumulates bounded deltas

`activeSeconds` grows by `min(secondsSinceLastTouch, ACTIVE_DELTA_CAP_SECONDS)`
(90s, just above the 60s ping interval).

The owner chose engaged time over wall-clock span as the headline metric, and the
cap is what makes that honest. The client heartbeat stops while the tab is hidden
and after 5 minutes without mouse/key/touch/scroll input, so when pings resume
the elapsed gap may be arbitrarily large — crediting it in full would report a
forgotten browser tab as an hour of work.

The cap also means the client heartbeat and the server-side work-touches
accumulate through one code path without double-counting, which is why both can
be wired safely.

Wall-clock span is not stored separately: it is always derivable as
`lastActiveAt - startedAt`, and both numbers are shown to the teacher. A large
gap between them is itself the signal that a student sat idle through a period.

### 3. Progress is attributed by time window, not by a session foreign key

Session progress is computed by querying the existing timestamped tables for
events falling inside `[startedAt, endedAt ?? lastActiveAt]`.

The alternative — stamping an `activitySessionId` onto `AssessmentAttempt`,
`AttemptResponse`, `SpacedReviewEvent`, `StudentProgress`, and
`StudentRemediation` — would be more precise, but it means a schema change plus a
write-path change on five hot student paths, including assessment submission.
Time-window attribution touches no student write path and is fully reversible.

The imprecision is bounded and acceptable: the gap between sessions (15 minutes)
is far larger than any plausible ambiguity about which session a submission
belongs to.

### 4. The duplicate-session race is accepted, and merged on read

Two requests arriving simultaneously for a student with no open session can each
create one. Rather than lock a hot write path, `mergeAdjacentSessions` collapses
any pair whose gap is under the session threshold when the report is read. The
only symptom of the race is one session briefly stored as two rows, and the read
model makes that invisible.

### 5. Areas are a bucketed enum, never raw paths

The heartbeat sends a bucketed area name (`mission`, `drill`, `assessment`, …)
derived from the pathname client-side, validated against a Zod enum server-side,
and stored as JSON keys in `areaSeconds`. Raw pathnames are never transmitted or
persisted. Adding an area later needs no migration.

### 6. Idle-close is lazy, not cron-driven

`closeStaleSessions` is called from the report builder rather than by a scheduled
job, consistent with ADR 0011's no-cron stance and the existing lazy-snapshot
approach in `eoc-analytics/snapshot.ts`. It changes no numbers — an open row is
already treated as ending at `lastActiveAt` everywhere it is read — so nothing
depends on it having run.

## Privacy posture

- **First-party only.** No third-party analytics or telemetry (non-negotiable
  rule #9). The heartbeat posts to this app's own route and nothing leaves the
  database.
- **No PII in query strings.** The area bucket travels in a POST body; the
  student is resolved from the session cookie, never from a request parameter,
  so one student cannot log activity as another.
- **Roster-scoped reads.** `getClassSessionActivity` and `getLivePresence` both
  call `assertClassOwnedByTeacher` internally, so the guard cannot be bypassed by
  a future caller that forgets it.
- **Configurable retention.** `ACTIVITY_SESSION_RETENTION_DAYS` (default 0 =
  retain forever) lets a district set a shorter window for behavioral monitoring
  data than for academic records. Purging session rows deletes no student work.
- **Invisible to students.** No timer, no countdown, no "you have been idle"
  nudge. Break reminders remain `PauseBanner`'s job. This keeps faith with the
  standing rule against timer-based UI that punishes students.

### Deliberately not exposed to parents

`ParentSummaryVM` is a strict allowlist with a test asserting no forbidden
fields (`tests/unit/parent-summary/fields-allowlist.test.ts`). Time-on-task and
session history are **not** added to it. Whether behavioral monitoring data is
appropriate to share with parents is a policy question against spec §23, not an
implementation detail — it needs an owner decision, and possibly a district one.

## Known gaps

- **Strategist Track uses cannot be attributed to a session.**
  `StrategyTrackProgress` timestamps only the first use (`completedAt`); later
  `useCount` increments carry no timestamp. Fixing this needs a schema change and
  was out of scope.
- **Lesson time is captured, but not per step.** The area breakdown shows minutes
  spent in missions; it cannot say which step the student was reading. Step-level
  timing would need a timestamped step-progress event.
- **Abandoned attempts have no expiry.** Pre-existing: an attempt started and
  never submitted keeps `submittedAt = null` forever. Practice attempts are
  attributed by `startedAt` to work around this.
- **A student with JS disabled reports only work-touch time.** The server-side
  touches guarantee sessions exist around graded work, but reading time would be
  invisible. Acceptable — the platform is unusable without JS anyway.

## Files

- Schema: `prisma/schema.prisma` (`StudentActivitySession`), migration
  `20260730120000_student_activity_sessions`
- Domain: `src/lib/activity-sessions/` (`config`, `sessionize`, `touch`,
  `report`, `login`)
- Instrumentation: `src/components/student/layout/ActivityHeartbeat.tsx`,
  `src/app/api/student/activity/ping/route.ts`, the six existing
  `recordActivity` call sites, `src/lib/auth/options.ts` events block
- Teacher UI: `/teacher/reports?tab=activity`,
  `src/components/teacher/reports/{LivePresencePanel,SessionActivityTable,SessionDetailList,DateRangePicker}.tsx`,
  `src/components/teacher/student/SessionHistoryCard.tsx`
- Export: `buildActivityReportCsv` in `src/lib/export/reports.ts`
- Retention: `src/lib/retention/{policy,purge}.ts`
- Tests: `tests/unit/activity-sessions/sessionize.test.ts`,
  `tests/integration/activity-sessions.test.ts`,
  `tests/integration/activity-report.test.ts`

## Audit-log catalog addition

`STUDENT_LOGIN` — written by `recordStudentLoginEvent` on a genuine student
sign-in. Actor is the student's `User.id`, entity is `User`.
