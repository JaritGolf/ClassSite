# ADR 0009 — Phase 15 content pipeline: AI-draft → owner-approve, validated by harness

**Status:** Accepted
**Date:** 2026-06-12
**Phase:** 15 (Full Course Expansion, §36.16)

## Context

Phase 15 must reach 30 approved, fully-tagged questions per benchmark across the full
SS.7.CG course (~990 questions) plus per-skill-tag remediation. This is a content-at-scale
problem; the engine work was finished in earlier phases. We needed to decide how content
is produced/approved and how the §13.2/§7.4 targets are enforced.

## Decisions

1. **AI-draft → owner-approve (Trust Tier C).** Claude drafts questions seeded as
   `sourceTier: C` / `approvalStatus: NEEDS_REVIEW`. They are never auto-approved (rule #3,
   "do not auto-approve"). The owner reviews and bulk-approves via the Phase 9 tooling
   (`bulkApproveByTag`). The harness guarantees *structure*; the owner guarantees
   *correctness*.

2. **Incremental, per-unit cadence.** A reusable seeder (`seed/questions/_seeder.ts`) plus
   a per-unit bank (`seed/questions/unit2.ts`) and a `*_COMPLETE_BENCHMARKS` list let the
   bank fill in benchmark-by-benchmark while the audit-15 drivers stay green at every step.
   The phase is tagged complete only when the whole course meets audit 15.

3. **§13.2 question category validated on the defs, not the schema.** The 7 §13.2
   categories (vocabulary, basic, scenario, source, chart, misconception, eoc-mixed) are an
   authoring construct carried on `QuestionSeedDef.category`. We validate the mix on the
   source-of-truth definitions (a pure unit test) rather than adding a DB column — keeping
   Phase 15 schema-free. Reading-load and cognitive-complexity ARE columns, so those
   distributions are validated at the DB level too.

4. **Source/chart content embedded inline; no required Stimulus rows.** Audit 15 does not
   require formal `Stimulus` rows (reading-load is a question column). Source-analysis and
   chart items embed their excerpt/data inline in the prompt, keeping the bank
   self-contained and tractable. Formal stimuli with the reading-load ladder remain
   available (Unit 1 pattern) and can be attached later without changing the questions.

5. **Remediation derived from the banks.** `seed/remediation_items.ts` derives the distinct
   (benchmark, skill_tag) pairs from the seeded questions and creates one `RemediationItem`
   per pair, so audit-15 item 6 coverage stays automatically in sync as units land.

## Consequences

- No schema change; no new dependency. Reusable, test-enforced pipeline.
- Content correctness is gated by owner approval, not by the seed — honest for AI drafts.
- Existing Unit-1-scoped seed tests were tightened to scope by `unitId` (Unit 2 is Tier C /
  NEEDS_REVIEW, so global "all questions are Tier B / APPROVED" no longer holds).
- A pre-existing `bulkApproveByTag` empty-match test was made deterministic (filter by a
  non-existent benchmark) instead of relying on a globally-empty pending pool.

## Alternatives rejected

- **Hand-author everything now:** highest authority but far too slow for ~990 items.
- **Add a `questionCategory` DB column:** triggers the schema-change gate for a value only
  used by authoring/validation; validating on the defs is sufficient.
- **One mega-drop of all content:** unreviewable and high blast radius; per-unit increments
  keep the suite green and the review tractable.
