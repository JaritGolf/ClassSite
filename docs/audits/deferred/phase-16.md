# Phase 16 — Deferred Ledger

**Created:** 2026-06-12
**Governing decision:** ADR 0006 (Tiered Verification Gate), ADR 0010 (L1 gloss pipeline)

L1 glosses (Spanish all tier-3 + Haitian Creole pipeline). Schema-free.

## Verified locally

- ✅ `./node_modules/.bin/tsc --noEmit` = 0 errors.
- ✅ `npm test` — full suite **896/896 green**, stable across 3 consecutive runs
  (incl. `audit16/01` + `l1-glosses` unit tests). The added DB load exposed a latent
  connection-pool exhaustion across the serial run; fixed by capping `connection_limit`
  in `tests/jest.setup.ts`.
- ✅ `npm run db:seed` clean (es 53/53 tier-3, ht sample 8, 15 accommodations).

## Owner / deferred

| Item | Status |
|---|---|
| Review + bulk-approve Spanish `TERM_TRANSLATION` glosses (closes audit item 3) | ⏳ Owner action — `/teacher/content` |
| Bulk Haitian Creole translation content (pipeline already works) | ⏳ Deferred (subsequent phase, per audit item 4) |
| `next build` | ✅ **PASS** (2026-06-19) — exit 0, 75 pages. |
| axe e2e on student pages that host `StimulusDisplay`/`GlossaryPopover` (mission/settings) | ✅ **PASS** (2026-06-19) — zero WCAG A/AA violations. |
| Manual a11y on an **expanded** gloss popover (keyboard focus, screen-reader `lang`) | ⏳ Owner-pending — the popover-expanded interactive state is genuinely manual; not self-certified. |

## Notes

- Only APPROVED translations are surfaced (`getGlossaryTermsForBenchmark`), so the
  NEEDS_REVIEW drafts are invisible to students until approved — safe to ship now.
- `FEATURE_L1_GLOSSES=false` disables the feature instantly during a pilot.
