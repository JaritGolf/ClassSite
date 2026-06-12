# Phase 15 — Deferred / In-Progress Ledger

**Created:** 2026-06-12
**Governing decision:** ADR 0006 (Tiered Verification Gate), ADR 0009 (content pipeline)

Phase 15 (Full Course Expansion) lands **incrementally per unit** and is **not tagged
complete**. This ledger tracks what remains.

## Verified locally (this session)

- ✅ `./node_modules/.bin/tsc --noEmit` = 0 errors.
- ✅ `npm test` — full suite **822/822 green** (incl. `audit15` drivers + the
  `unit2-category-mix` unit test) after `npm run db:seed`.
- ✅ All 36 SS.7.CG benchmarks loaded (item 1).
- ✅ Reusable seeder + audit-15 harness + remediation pipeline.
- ✅ Unit 2 benchmark **SS.7.CG.1.7** authored to the full 30 (the proven template).

## Remaining content (per unit — repeat the template)

| Item | Status |
|---|---|
| Unit 2 SS.7.CG.1.8–1.11 (×30 each) | ⏳ TODO — append to `seed/questions/unit2.ts` + `UNIT2_COMPLETE_BENCHMARKS` |
| Unit 1 backfill 15 → 30 per benchmark | ⏳ TODO |
| Units 3–7 question banks (×30 each) | ⏳ TODO — new `seed/questions/unitN.ts` using `seedQuestionDefs` |
| Owner bulk-approval of NEEDS_REVIEW drafts | ⏳ Owner action — flips Tier C drafts to APPROVED (closes item 2 "approved") |

## Deferred (Tier-3, run in CI)

| # | Item | Status |
|---|---|---|
| D1 | `npm run build` | ⏳ Not run |
| D2 | e2e smoke on a Unit 2 mission/assessment | ⏳ Not run |

## How to extend (next session)

1. Author the next benchmark's 30 questions in `seed/questions/unit2.ts` (or a new
   `unitN.ts`) using the same distribution template (cat 4/4/8/4/3/3/4, reading 9/15/6,
   complexity 6/17/7).
2. Add its code to `UNIT2_COMPLETE_BENCHMARKS` (or the unit's complete-set export) and to
   `QUESTION_BANKS` in `seed/remediation_items.ts` if a new unit file.
3. `npm run db:seed` then `npm test` — the audit-15 drivers automatically validate the
   newly-completed benchmark.
