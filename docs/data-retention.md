# My Civics Class — Data Retention Policy (Phase 17)

> Audit §36.18 item 8. The retention policy is **configurable** via environment variables and
> **conservative by default** (retain everything). No data is deleted unless an admin sets a
> positive threshold and explicitly runs the purge.

## Policy model

| Data class | Env variable | Default | What is removed |
|---|---|---|---|
| Audit logs | `AUDIT_LOG_RETENTION_DAYS` | `0` (keep forever) | `AuditLog` rows with `createdAt` older than the threshold |
| Voided assessment attempts | `VOIDED_ATTEMPT_RETENTION_DAYS` | `0` (keep forever) | `AssessmentAttempt` rows where `voided = true` and `submittedAt` older than the threshold, plus their `AttemptResponse` / `AdaptiveSessionState` children |
| Student activity sessions | `ACTIVITY_SESSION_RETENTION_DAYS` | `0` (keep forever) | `StudentActivitySession` rows with `startedAt` older than the threshold (ADR 0019) |
| Suggestion free text | `SUGGESTION_RETENTION_DAYS` | `0` (keep forever) | `Suggestion` rows with `createdAt` older than the threshold (ADR 0021) |
| Assessment focus events | _(none — follows the attempt)_ | n/a | `AttemptIntegrityEvent` rows are deleted with their voided attempt under `VOIDED_ATTEMPT_RETENTION_DAYS` (ADR 0020) |
| **Disenrolled students** | `STUDENT_RECORD_RETENTION_DAYS` | **`90`** | **Everything** belonging to a student whose `deactivatedAt` is older than the threshold — see the statutory section below |

For the first four, `0`, unset, negative, or non-numeric all mean **retain forever**. Fractions
are floored. **`STUDENT_RECORD_RETENTION_DAYS` does not follow that rule** — see below.

**Only voided attempts are eligible** — active mastery/progression data is never purged by this
policy. Content is archived (not deleted) via the content-approval flow.

**Activity sessions are monitoring data, not academic records.** They record when a student was
on the platform and for how long. Purging them removes only that monitoring history — no student
work, scores, mastery state, or spaced-review state is touched, and the rows have no children.
Districts may reasonably want a *shorter* window here than for academic records: behavioral
observation of a minor has less justification for long-term storage than the coursework itself.

### Suggestions (ADR 0021) — window added 2026-08-07

The `suggestions` table (nav-bar suggestion box) stores **student- and teacher-authored free
text**. It previously had no retention window; `SUGGESTION_RETENTION_DAYS` now covers it. The
default is still `0` (retain forever) so that adding the window changed no existing deployment's
behaviour — **set it deliberately.** One school year (`365`) is the natural value, since a
suggestion's usefulness is almost entirely within the term it was written.

Why this class got its own window: it is the only free prose a student can enter anywhere in the
application, which makes it the only place data nobody designed for can arrive. In particular,
Fla. Stat. § 1002.222(1)(a) forbids an education agency from collecting or retaining information
on a student's **political affiliation, voting history, or religious affiliation**. The app
collects none of those by design and has no field for them — but it cannot un-know something a
student volunteers in a text box. A bounded window limits how long anything unexpected persists,
and the box now carries a plain reminder ("Tell us about the app, not about yourself").

Three mitigations were already in place and remain:

- the suggestion body is **never** copied into `AuditLog.metadataJson`, so it is not reachable
  through `/api/admin/audit/export` (the audit metadata carries `bodyChars`, not the body);
- there is **no** suggestions CSV export, deliberately — see ADR 0021 §7;
- `contextJson` carries viewport width only — no user agent, no IP.

### Disenrolled students — Fla. Stat. § 1006.1494(3)(c)

This is the one window that is **not** a preference. Florida's Student Online Personal
Information Protection Act makes this application an "operator," and § 1006.1494(3)(c) requires:

> "Unless a parent or guardian expressly consents to the operator retaining a student's covered
> information, delete the covered information at the conclusion of the course or corresponding
> program and no later than **90 days** after a student is no longer enrolled in a school within
> the district, upon notice by the school district."

**How it works.** The statutory trigger is *district notice*, which software cannot observe. So
an administrator records the notice and the app computes the deadline:

1. District notifies the school that a student has left.
2. An administrator calls `markStudentDisenrolled(studentId, actorUserId)`, which sets
   `Student.active = false`, stamps `Student.deactivatedAt`, and writes a `STUDENT_DISENROLLED`
   audit row. This is the start of the clock, and it is idempotent — repeating the call cannot
   push the deadline back.
3. On or before day 90, `purgeDisenrolledStudents()` deletes every record belonging to that
   student, then the `Student` and `User` rows, and writes a `STUDENT_RECORDS_PURGED` audit row.

**Why the default is 90 and not 0.** Every other window here defaults to retain-forever because
retaining is the conservative choice. Here it is the opposite: retaining past 90 days is the
violation. Defaulting it on is safe because nothing is in scope until a human records a
disenrollment — a student who is still enrolled has `deactivatedAt = null` and no clock running.

**The value is capped at 90 and cannot be raised.** A district may direct a *shorter* window. A
longer one is not available through configuration: the only lawful route past 90 days is express
parental consent, which is a per-student fact and not something an environment variable can
assert for a whole cohort. Values above 90 are clamped down; an unparseable value falls back to
90 rather than to 0, so a typo cannot silently disable the duty. Only a literal `0` opts out, and
that should be done only under a documented district arrangement.

**What is deleted.** Every table holding the student's `studentId` — progress, attempts and their
responses, spaced-review state, calibration snapshots, badges, streaks, accommodations, activity
sessions, parent links, enrollments, their suggestion text — then the `Student` row, then the
`User` row. The list is maintained by hand in `CHILD_DELETION_ORDER`
(`src/lib/retention/student-records.ts`) because **none of Student's child relations cascade**;
`tests/integration/retention-student-records.test.ts` fails with a foreign-key error if a new
table is added and not registered there.

**What survives, and why.** Audit logs are not deleted. `AuditLog.actor` is an optional relation,
so removing the user nulls the actor reference and leaves the compliance trail intact; what
remains is an action name and a bare identifier that no longer resolves to any person. Audit rows
age out under their own window. The `STUDENT_RECORDS_PURGED` record deliberately does **not** list
the student ids it removed — writing them there would re-create the identifier the purge just
deleted.

## How it works

- Pure policy resolution: `src/lib/retention/policy.ts` (`resolveRetentionConfig`, `cutoffDate`).
- Purge runner: `src/lib/retention/purge.ts` (`purgeExpiredData`). Deletes children before
  parents inside a transaction and writes a `RETENTION_PURGE` audit log.
- Every purge supports a **dry run** that reports eligible counts without deleting.

## Running a purge

**Preview (safe, default):**
```
npm run retention:purge            # dry run — prints eligible counts
```

**Apply:**
```
npm run retention:purge -- --apply # actually deletes
```

**From the admin UI:** `/admin/retention` shows the active policy and a live dry-run preview,
with a guarded "Run purge now" button (ADMIN only). The API is
`POST /api/admin/retention/purge` with `{ "dryRun": false }` to apply.

## Scheduling

No scheduler is deployed (spec §26 lists the background queue as optional). To run retention on
a schedule, invoke `npm run retention:purge -- --apply` from a cron/scheduled job in your
hosting environment. Tracked in `docs/audits/deferred/phase-17.md`.

## District configuration

Set the thresholds per the district's approved retention windows before production (e.g.
`AUDIT_LOG_RETENTION_DAYS=1095` for 3 years). Record the approved values with the privacy
sign-off (`docs/privacy-review.md`).
