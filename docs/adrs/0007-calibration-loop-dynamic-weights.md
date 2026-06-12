# ADR 0007 — Calibration Loop Closure via Dynamic Active Weights

**Date:** 2026-06-06
**Status:** Accepted
**Phase:** 13 (Calibration Loop, spec §36.14 / §20.5)

## Context

Phase 10 built the EOC calibration infrastructure ahead of schedule: consent-gated
score import, Pearson correlations, calibration-run creation, admin approval, the admin
dashboard, and the year-one banner. But it deliberately left the loop **open** — when an
admin approved a run, the recommended weights were stored in
`EocCalibrationRun.recommendedWeightChanges` yet readiness scoring still used the
hard-coded `REPORTING_CATEGORY_WEIGHTS` constant in `readiness.ts`. The Phase 10 build
note recorded: "Phase 13 will read the latest applied run at startup to load dynamic
weights."

The non-negotiable constraint: **calibration weight changes must never auto-apply** —
an admin must approve them.

## Decision

Introduce `src/lib/eoc-analytics/active-weights.ts` as the single source of truth for
"which blueprint weights is readiness scoring currently using":

- `getActiveWeightSource()` reads the **most recent `applied=true`** `EocCalibrationRun`
  and returns `{ source: 'calibrated', weights, runId, schoolYear, appliedAt }`. If no
  run has been approved, it returns `{ source: 'default', weights: REPORTING_CATEGORY_WEIGHTS }`.
- `getActiveCategoryWeights()` is the convenience map used by scoring.
- `resolveCategoryWeight(name, weights)` mirrors the existing case-insensitive
  substring match (replacing direct use of `weightForCategoryName`).

`computeStudentReadiness` and `computeClassReadiness` now load the active weights once
and resolve against them. The admin calibration page gains an `ActiveWeightsPanel`
showing whether scoring is calibrated or on the default blueprint.

## Why this satisfies "never auto-apply"

Only runs an admin has **explicitly approved** (`applied=true`, set solely by
`approveCalibrationRun`) are ever read. Reading an approved decision at runtime is the
*application* of an admin's choice — not an automatic recalibration. The
`REPORTING_CATEGORY_WEIGHTS` constant is **never mutated**; it remains the immutable
blueprint baseline that recommendations are computed against and the fallback when
nothing is approved.

## Consequences

- The calibration loop is closed: outcomes → import → run → **admin approval** →
  readiness scoring reflects the approved weights. Reverting is a one-click concern
  (delete/supersede the approved run) and the system falls back to baseline.
- `getActiveWeightSource` reads the latest applied run **globally** (not per–school-year),
  so the newest approved calibration always governs scoring. Tests that create approved
  runs must clean them up (the `audit13` drivers do).
- No schema change — `EocCalibrationRun.recommendedWeightChanges` (Json) already stored
  the `{ current, recommended, deltaPercent }` shape Phase 10 wrote.

## Reversibility

Remove the `getActiveCategoryWeights` calls in `readiness.ts` to revert to the static
constant. No data migration involved.
