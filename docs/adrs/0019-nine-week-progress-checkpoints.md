# ADR 0019 — Nine-Week Progress Checkpoints (Levels)

**Date:** 2026-07-25
**Status:** Accepted (owner-directed; spec-silent feature)

## Context

The owner must submit a grade for each student at the end of each of the four
nine-week grading periods. The platform had no concept of a calendar deadline or a
progress target — only mastery. There was no way to express "by October 17 you
should be here on the Mission Map", and no way to read off how far each student
actually got by that date.

The build spec is **silent** on grading periods: searches for nine weeks / quarter /
marking period / grading period / report card / letter grade return nothing, §8.3
lists "External gradebook sync" as a non-goal, and §25.1 records "External
gradebook data | No for MVP". §37 explicitly parks "confirm district pacing guide
structure" as an open question. So this lands as an owner decision plus this ADR,
not as a spec-derived phase.

Three constraints from the existing product shaped it: mastery-not-seat-time
unlocking (§21.6), "do not punish absences" (freeze tokens, not timers), and no
public individual leaderboards (§21.7).

## Decision

1. **Levels are the only vocabulary; grades are never named — nor denied.**
   Levels *are* the owner's grades, reframed to create psychological separation
   between the platform and school so a student experiences progress and learning
   rather than grading. Consequently no surface says "grade", and no surface says
   "this is not a grade" either — a denial reintroduces exactly the framing the
   reframing exists to remove. This governs student, parent, teacher and print copy.
   A guard for this is social, not automated: reviewers should reject grade
   vocabulary in any Level-adjacent string.

   *Scope note:* this is **not** a ban on percents platform-wide. Percents already
   exist (mastery score on map nodes, `ReadinessMeter`, CSV readiness columns) and
   were left alone. The rule is that **Level surfaces** carry no percent, letter or
   points.

2. **Progress is never gated by a date (rule #7 / §21.6).** No checkpoint, date or
   Level restricts what a student may open. Enforced by
   `tests/integration/progress-checkpoints/no-gating.test.ts`, a static guard
   asserting that no access-deciding module (`lib/mastery`, `lib/assessment`,
   `lib/spaced-retrieval`, `lib/adaptive-difficulty`, the mission page, the
   assessment routes) imports `progress-checkpoints`, and that the checkpoint module
   never writes `StudentProgress`.

3. **Config is a teacher-owned plan, not per-class columns.** `ProgressPlan` is
   unique on `(teacherId, schoolYear)`; `Class.progressPlanId` is nullable and means
   "use my plan for this class's school year". One district calendar is entered once
   for every section, and a single section can still be split onto its own pace
   later without a data migration. Named **checkpoint**, never "period":
   `Class.period` already means bell-schedule period.

4. **Targets are hand-set and may be sparse.** The owner sets each level's target
   mission explicitly. A checkpoint may carry fewer than four levels and simply caps
   there — necessary, not merely convenient: only **8 of 36** missions are
   completable today (SS.7.CG.1.1–1.7 and 1.10), so sixteen strictly-increasing
   targets cannot be drawn. The config UI states the coverage and disables
   ineligible missions with the real reason ("Unit 3 — no content yet" vs "No Mastery
   Challenge authored yet").

5. **The level rule is a PREFIX rule.** Level = highest N such that the targets for
   levels 1..N are *all* cleared — not "highest cleared target". A teacher's
   `UNLOCK_BENCHMARK` override lets a student skip ahead, so the naive rule would
   award Level 4 to a student who never cleared the Level 2 target. Observed live in
   demo data: a student with missions 1.1 and 1.4 cleared (but not 1.2/1.3) correctly
   reports Level 1, where the naive rule would have reported Level 4.

6. **"Cleared" = `MASTERED` | `EXPOSURE_COMPLETE` | `TEACHER_OVERRIDE`** (owner's
   choice). Off-ramped missions count, consistent with rule #4's "off-ramp is not
   failure" — a student who fought through three attempts plus remediation is not set
   back twice. Note `daily-report/report.ts` already defines a different "mastered
   count" (`MASTERED || TEACHER_OVERRIDE`, excluding off-ramp); that code is
   deliberately not reused, and the student UI states which rule Levels use.

7. **Validation is two-stage.** Zod (route) checks shape only; "targets must advance
   along the mission map" and "the mission must be completable" depend on
   `Benchmark.sequenceOrder` and assessment availability, so they run in the domain
   layer and return plain-language problems. Ordering is **strictly** increasing —
   equal targets would fire two levels at once and make the display jump.

8. **Closed checkpoints lock; catch-up is surfaced separately.** Once the end date
   passes, each student's level is written to `StudentCheckpointLevel` so a reported
   number never shifts. `targetsJson` **freezes the targets that produced it** —
   targets stay editable, so without the frozen copy a locked row would report a
   level nobody could reconstruct. A later higher level appears as `caughtUpLevel`
   ("has since reached Level 4") for the teacher to act on, rather than mutating the
   locked value.

9. **Locking is lazy and DB-idempotent.** First read after the date writes the rows
   via `createMany({ skipDuplicates: true })` against
   `@@unique([checkpointId, studentId])`. This is deliberately stronger than the
   `getOrCreateDailyClassSnapshot` precedent, whose table has no unique constraint
   and which therefore only tolerates duplicates. A **student's** read snapshots only
   that student; a **teacher's** read snapshots the roster.

10. **Timezone correctness is explicit.** `endsOn` is `@db.Date`, which Prisma reads
    back as UTC midnight. An exclusive bound of `endsOn + 1 day` in UTC would cut
    students off at **8pm Eastern** on the due date. `endOfSchoolDayUtc` resolves the
    start of the next `America/New_York` day via `Intl`, unit-tested across a DST
    boundary (October vs December differ by an hour).

## Progression defects fixed in the same work

The feature is unusable without these, so they shipped together.

- **The unit wall.** `unlockNextBenchmark` was scoped to `unitId` and returned
  `false` at a unit's last mission — mastering SS.7.CG.1.6 unlocked nothing, so no
  student could ever leave Unit 1.
- **The content wall behind it.** SS.7.CG.1.8/1.9/1.11 have **zero** assessments, so
  they have no Mastery Challenge: unmasterable *and* un-off-rampable (off-ramp needs
  3 failed Mastery Challenge attempts). Naively removing the unit filter would have
  moved the wall from mission 6 to mission 8. Unlock is now content-aware, requiring
  an APPROVED `MASTERY_CHALLENGE` in an active unit, and filters on the `SS.7.CG.`
  code prefix because `Benchmark.sequenceOrder` is **not unique** and several suites
  insert fixtures at 9995-9999.
- **Unlocking was invisible.** `LOCKED_STATUSES = {'NOT_STARTED'}` plus the map's
  `progress?.status ?? 'NOT_STARTED'` default meant "no row" and "unlocked, not yet
  started" rendered identically as *Locked* with no link — and `unlockNextBenchmark`
  creates exactly a NOT_STARTED row. Nothing bootstrapped a new student's first row
  either, so a brand-new student saw a fully locked map with no way in.
  `lib/mastery/availability.ts` now derives openness from row existence, with the
  first reachable mission as the entry point, and the map has an `AVAILABLE`
  ("Ready to Start") state.
- **`masteredAt` was not write-once.** `status.ts` re-stamped it on every pass,
  including a `REASSESSMENT` of an already-mastered mission. Combined with lazy
  locking, a mission cleared in September could silently drop out of an unread Q1
  snapshot. Now `masteredAt: existing ?? new Date()`; `masteryScore` still tracks the
  latest passing score.

## Audit-log catalog

- `PROGRESS_TARGETS_UPDATED` — exported as `PROGRESS_CHECKPOINT_AUDIT_ACTIONS` from
  `src/lib/progress-checkpoints`, written inside the same `$transaction` as the
  config update, `entityType: 'ProgressPlan'`, `metadataJson: { classId, before, after }`.
- CSV export reuses the existing `REPORT_EXPORTED` action with
  `metadataJson.report = 'progress-levels'`.

## Parent surface

One new allowlisted section, `progressCheckpoints`, added to `ParentSummaryVM`.
Because `ParentSummaryView` is shared it lands on three surfaces at once: the parent
dashboard, the parent's per-student page, and the teacher's printable summary — so
the printable conference handout works immediately, while the parent *login* remains
behind `FEATURE_PARENT_PORTAL` pending district parent-identity policy.

Parents see the current quarter and date, the Level with missions-to-next, the
recorded Level for each closed quarter, positively-framed catch-up, and one
how-to-help line. Parents do **not** see grade vocabulary in either direction,
letters/percents/points, class rank or comparison to other students, which missions
were off-ramped versus mastered (consistent with `EXPOSURE_COMPLETE` already being
withheld), or item-level data.

**Two** pinned allowlists had to be updated deliberately — `PARENT_SUMMARY_FIELDS`
with `tests/unit/parent-summary/fields-allowlist.test.ts`, **and** the separate
`ALLOWED_KEYS` array in `tests/integration/audit18/03-forbidden-fields.test.ts`. The
second one caught the addition on a full-suite run, which is the guard working as
designed. `audit14/02`'s deep forbidden-token scan constrains nested field names *and
rendered copy*, so parent strings must avoid `override`, `confidence`,
`calibration`, `decay`, `accommodation`, `distractor`.

## Consequences

New tables `progress_plans`, `progress_checkpoints`, `progress_checkpoint_targets`,
`student_checkpoint_levels`, plus nullable `classes.progress_plan_id` — migration
`20260724120000_progress_checkpoints`, hand-written and applied with
`npm run db:deploy` (`migrate dev` is non-interactive-incompatible in this harness).
Additive only: no existing column changed type or nullability.

New module `src/lib/progress-checkpoints/` (pure `levels.ts`, plus `config.ts`,
`student-level.ts`, `snapshot.ts`) and `getCheckpointLevelsForTeacher` in
`class-analytics`. Roster authorization lives in the domain layer, not only the
route, mirroring the 2026-07-15 IDOR fix.

**Reversible:** the feature is inert without configuration — with no `ProgressPlan`
row, every checkpoint surface renders nothing and the platform behaves exactly as
before. Dropping the four tables and the one column removes it entirely. The
progression fixes (cross-unit unlock, map availability, write-once `masteredAt`) are
independently valuable and would be kept.

## Deferred

- Quarters 3-4 cannot be fully laddered until Phase 15 content lands (8 of 36
  missions completable). No code change needed — the config UI opens up as content
  ships.
- Activating a unit later does not retro-unlock: a student parked at the last
  reachable mission is not advanced automatically when new content ships. The
  teacher's `UNLOCK_BENCHMARK` override covers it; a one-time backfill should ride
  with the content wave that flips a unit active.
- `resetAttempt` does not revert `StudentProgress`, so voiding a mastery attempt does
  not lower a Level (pre-existing).
- No parent notification as a checkpoint approaches; no per-student target overrides
  (the strategy-track override pattern exists if wanted).
- The new teacher page is not covered by `tests/e2e/a11y-staff.test.ts`.
