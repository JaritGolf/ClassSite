# Audit 15: Full Course Expansion (Phase 15)

Spec reference: §36.16 / §13.2 (question bank targets) / §7.4 (cognitive complexity).

Phase 15 scales the course to the full SS.7.CG benchmark set and builds a **scalable,
test-enforced content pipeline**. Content is AI-drafted (Trust Tier C) and seeded as
`NEEDS_REVIEW`; the owner reviews and bulk-approves before it counts as "approved."

This phase lands **incrementally per unit**. The audit-15 drivers
(`tests/integration/audit15/01-course-expansion.test.ts` + the pure
`tests/unit/seed/unit2-category-mix.test.ts`) validate item 1 course-wide and items 2–6
for the benchmarks in `UNIT2_COMPLETE_BENCHMARKS`, which grows as the bank fills in.

---

- [x] 1. All SS.7.CG benchmarks loaded.
      All **36** benchmarks across 7 units are seeded with reporting-category mapping and
      sequence (`seed/benchmarks.ts`). Driver: `01` item-1 tests.

- [~] 2. 30 approved questions per benchmark minimum (more for high-weight).
      Reusable seeder (`seed/questions/_seeder.ts`); per-unit banks plug in. **Done so far:**
      SS.7.CG.1.7 (30). Remaining Unit 2 (1.8–1.11) + Units 3–7 + Unit 1 backfill (15→30)
      continue per session. The **"approved"** qualifier is satisfied when the owner
      bulk-approves the NEEDS_REVIEW drafts (`bulkApproveByTag`, `/teacher/content`).

- [~] 3. Question distribution matches §13.2 targets.
      Per completed benchmark: vocab 4 · basic 4 · scenario 8 · source 4 · chart 3 ·
      misconception 3 · eoc-mixed 4. Validated on the defs (category is an authoring
      construct, not a DB column) by the unit test.

- [~] 4. Reading-load distribution matches §13.2 (30/50/20).
      Per completed benchmark: level-1 ×9 · level-2 ×15 · level-3 ×6. Validated at the DB
      level by `03` and on the defs by the unit test.

- [~] 5. Cognitive-complexity distribution matches §7.4.
      Per completed benchmark: LOW ×6 · MODERATE ×17 · HIGH ×7 (inside the 15–25 / 45–65 /
      15–25 bands). Validated by `04` (bands) and the unit test (exact).

- [~] 6. Each benchmark has ≥1 remediation activity per major skill_tag.
      `seed/remediation_items.ts` derives (benchmark, skill_tag) pairs from the question
      banks and seeds a `RemediationItem` per pair. Validated by `06`.

`[x]` = complete course-wide · `[~]` = framework complete + green for completed benchmarks,
fills in per unit.

## Owner action (closes item 2 "approved")

AI-drafted questions land as `sourceTier: C` / `approvalStatus: NEEDS_REVIEW`. Review in
`/teacher/content` and **bulk-approve** (per benchmark / reporting category / unit) to flip
to `APPROVED`. Claude's harness guarantees structure (count, distribution, tagging,
remediation); the owner guarantees correctness at approval.

## Verification

- Tier 1: `./node_modules/.bin/tsc --noEmit` = 0 errors.
- Tier 2: `npm run db:seed` then `npm test` — full suite green incl. `audit15` + the
  category-mix unit test.
- Tier 3 (deferred): `next build`, e2e — see `docs/audits/deferred/phase-15.md`.
