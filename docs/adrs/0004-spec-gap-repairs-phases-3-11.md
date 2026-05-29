# ADR 0004 — Spec-Gap Repairs to Completed Phases 3–11

**Date:** 2026-05-29
**Status:** Accepted
**Phase:** 3–11 (repair)

## Context

An audit of completed phases (0–11) against `civics_quest_v3_build_spec.md` found gaps
concentrated in student-facing UI, the metacognition/calibration loop, and several required
dashboard pages. The owner approved fixing all Section-A gaps plus the cheap Section-B items
(strategy track, source-lab route, assessment types), deferring true future-phase work
(class-Republic build, context boost, L1 glosses, admin CMS, background queue) to its phase.

## Decisions

1. **Calibration snapshot writer + student feedback (spec §17.4, §29).** `gradeAndSubmit`
   now computes a per-confidence-level breakdown for confidence-required assessments, returns
   it to the student (rendered in `AssessmentPlayer`), and writes `ConfidenceCalibrationSnapshot`
   rows (overall + per-benchmark) **non-fatally** — mirroring the existing `updateProgressAfterAttempt`
   hook. The table was previously read by teacher dashboards but never populated, so the
   calibration *trend* had no history. The full 2-line trend graph is deferred; a textual
   per-confidence summary satisfies the §17.4 MVP.

2. **Functional pre-check & readiness check (spec §10.4 steps 1 & 7).** Added a `PRE_CHECK`
   `AssessmentType` (migration `20260529120000_phase11_repair_assessment_types`, which also adds
   `VOCAB_CHECK` and `UNIT_REVIEW`). `seed/assessments_unit1.ts` seeds one of each assessment
   type per Unit 1 benchmark plus one Unit-1-wide `UNIT_REVIEW`, idempotent by
   `(benchmarkId, assessmentType)`. `MissionFlow` embeds `AssessmentPlayer` for the pre-check and
   readiness steps; the Mastery Challenge step unlocks only after the readiness check passes
   client-side. `PRE_CHECK`/`READINESS_CHECK` are non-mastery-affecting (already enforced in
   `updateProgressAfterAttempt`), so the pre-check stays ungraded for progression.

3. **Reachable student surfaces.** Added pages for engines that existed without a route:
   `/student/source-decoder`, `/student/remediation/[id]`, `/student/source-lab/[id]`, and the
   dashboard now links the current remediation task. These reuse the existing Phase 4/7 engines
   and components.

4. **Teacher dashboards.** Added `/teacher/reporting-categories`, `/teacher/eoc-readiness`, and a
   `/teacher/questions` Question Bank manager (+ `GET /api/teacher/questions`), all reusing
   existing analytics libs.

5. **Tag validation service (rule #3, §29).** New `src/lib/eoc-alignment/` provides
   `validateQuestionTags` and `getBlueprintCoverage`. The Question Bank flags under-tagged items,
   and an integration guard test asserts every seeded Unit 1 question is fully tagged.

6. **Strategy track (§19.2).** New `src/lib/strategy-track/` (7 hardcoded missions, mirror of the
   Source Decoder pattern), `/api/strategy/*`, `/student/strategy`, and three STRATEGY badges.
   Missions are independent (no prerequisite chain) since they are suggested-not-required.

## Consequences

- `SubmitResult` gains a `calibration` field (only `attempt.ts` constructs it; safe).
- Several integration suites needed `ConfidenceCalibrationSnapshot` cleanup added to `afterAll`
  (same pattern as the prior `EocReadinessSnapshot` cleanup).
- `UNIT_REVIEW` assessments use `benchmarkId = null` (span benchmarks, like Republic Challenge).
- The Question Bank and EOC-readiness/reporting-category teacher pages render the **first** class
  for now; multi-class selection is deferred (consistent with existing dashboard behavior).
- Alternate reassessment from the remediation page links to the benchmark's fixed-form Mastery
  Challenge ("Second Chance"); true alternate-pool generation remains a deeper future feature.
