# Audit 13: Calibration Loop (Phase 13)

Spec reference: Section 36.14 / Section 20.5 (EOC Calibration Feedback Loop)

Most of the calibration *infrastructure* (import, correlation, runs, approval, admin
UI, year-one banner) shipped early in Phase 10. Phase 13 **closes the loop**: readiness
scoring now consumes the latest admin-approved calibration run's weights. Driver tests
live in `tests/integration/audit13/` (+ a pure unit test in
`tests/unit/eoc-analytics/active-weights.test.ts`).

---

- [ ] 1. `eoc_actual_scores` and `eoc_calibration_runs` tables exist.
      Driver: `01-tables-exist.test.ts` (count query on each model).

- [ ] 2. Score import respects the district consent flag.
      Driver: `02-consent-gate.test.ts` — `importEocScore` rejects
      `consentAcknowledged !== true` with `NO_CONSENT`, accepts once acknowledged.

- [ ] 3. Correlation calculations produce expected values on synthetic data.
      Driver: `03-correlation-synthetic.test.ts` — `pearsonCorrelation` /
      `correlationByBucket` on known series (±1 and intermediate).

- [ ] 4. Admin dashboard renders calibration runs.
      `/admin/calibration` (RSC) renders `CalibrationRunCard` per run plus the new
      `ActiveWeightsPanel` showing whether scoring uses calibrated or default weights.

- [ ] 5. Recommended weight changes do NOT auto-apply (require admin approval).
      Driver: `04-no-auto-apply.test.ts` — an unapproved run is not the active source;
      only `approveCalibrationRun` makes it active. The `REPORTING_CATEGORY_WEIGHTS`
      constant is never mutated.

- [ ] 6. Year-one default state shown when no scores exist.
      Driver: `05-year-one-default.test.ts` — `getCalibrationStatus` returns
      `YEAR_ONE_NO_SCORES`; active weights fall back to the blueprint baseline when no
      run is approved. UI: `CalibrationStatusBanner`.

- [ ] 7. (Loop closure — Phase 13 deliverable) Approved weights drive readiness scoring.
      Driver: `06-loop-closure.test.ts` — after approving a run that sets
      "Government Policies" to 0.40, `computeStudentReadiness` applies 0.40 to that
      category instead of the 0.175 blueprint baseline.

---

## Notes

- Active weights are resolved by `getActiveWeightSource()` /
  `getActiveCategoryWeights()` in `src/lib/eoc-analytics/active-weights.ts`, which reads
  the most recent `applied=true` run and falls back to `REPORTING_CATEGORY_WEIGHTS`.
- Per the tiered verification gate (ADR 0006), the jest run for these drivers is a
  blocking Tier-1/2 item to be executed in CI / a healthy Node environment; `tsc` is
  green locally. See `docs/audits/deferred/phase-13.md` if any tier is deferred.
