# ADR 0014 — Strategy Track: usage tracking, configurable requirement, teacher visibility

Status: Accepted (2026-07-15)

## Context

The Strategist Track (spec §19.2) shipped as a click-through checklist: a
mission "completed" the moment a student tapped "Got it — mark complete" (an
empty POST). There was nothing to actually do, no teacher visibility, and no
requirement. The owner asked to make strategies genuinely embedded and
trackable, with per-student assignment and a teacher-set required count.

## Decision

1. **A "use" is one correct apply-it round.** Each of the 7 missions now carries
   1–2 authored apply-it check questions. A round is graded **server-side**
   (`submitStrategyRound`); a round where every check is correct increments
   `StrategyTrackProgress.useCount` (atomic `increment`) and counts as one use.
   Students re-run a mission to accrue uses.

2. **Apply-it content is authored in code, graded on the server.** The check
   questions live in `src/lib/strategy-track/index.ts`, not the DB question
   bank. This mirrors lesson interactive checks (ADR 0013), which are
   instructional scaffolding scoped *out* of the tagging/approval pipeline
   (rule #3). Unlike lesson checks, strategy rounds are graded **server-side**
   so use-counts can't be forged from the client (rule #1); correct answers are
   stripped from the served payload and options are shuffled with the existing
   `seededShuffle` so the answer never leaks pre-submit (rule #2).

3. **Requirement = one global number + per-student overrides.**
   `Class.strategyUsesRequired` (0 = off) is the class-wide "use each strategy N
   times." `StudentStrategyOverride(studentId, missionCode, requiredUses?,
   waived)` overrides per student. Resolution: `waived → 0`, else
   `requiredUses ?? classGlobal`. Multi-class students resolve from their first
   ACTIVE class (same simplification as EOC readiness).

4. **Soft nudge, never a hard gate.** Unmet requirements surface as a "you owe N
   uses" nudge on the student strategy page; nothing blocks mastery
   progression. This preserves the off-ramp philosophy (a parallel track must
   not softlock a student). The teacher override is the escape valve.

5. **Teacher visibility in two places.** A roster completion table on the class
   dashboard (`getStrategyCompletionStatus`) and a per-strategy override panel
   on the student profile (`StudentProfileVM.strategyTrack`).

6. **`completedAt` now means "used at least once."** It is set on the first
   correct round, so the existing badge criteria (`strategy_mission`,
   `strategy_track_complete`) remain valid. The badge engine is now also invoked
   from the strategy attempt route, fixing a latent bug where strategy badges
   only awarded retroactively via unrelated activity.

## Audit-log catalog

New action: `STRATEGY_REQUIREMENT_OVERRIDDEN` (entityType `StudentStrategyOverride`),
written by `setStrategyOverride` alongside the roster IDOR guard
(`assertStudentInTeacherClass`, mirroring `applyTeacherOverride`).

## Consequences

- Schema: `StrategyTrackProgress.useCount`, `Class.strategyUsesRequired`, new
  `StudentStrategyOverride` (migration `20260715120000_strategy_usage_tracking`).
- `completeStrategyMission` and the `/api/strategy/[code]/complete` route are
  removed; replaced by `submitStrategyRound` and `/api/strategy/[code]/attempt`.
- Reversible: dropping the requirement (set 0 everywhere) restores a pure
  practice track with no gate; the content and use-counts remain.

## Deferred

- Crediting a strategy "use" during live assessments (needs question→strategy
  tagging).
- Per-class strategy target picker for multi-class students.
- A student-dashboard nudge widget (the nudge currently lives on the strategy
  page only).
