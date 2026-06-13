# Audit 16: L1 Glosses (Phase 16)

Spec reference: §36.17 / §22 (Appendix G accommodations) / §29 (feature flags).

L1 (first-language) glosses for tier-3 civics terms. Spanish for all tier-3 terms +
a functional Haitian Creole pipeline. Schema-free (reuses `Term` / `TermTranslation` /
`Student.l1Language`). AI-drafted translations seed as `NEEDS_REVIEW`; display is gated to
APPROVED (ADR 0010). Drivers: `tests/integration/audit16/01-l1-glosses.test.ts` +
`tests/unit/l1-glosses/l1-glosses.test.ts`.

---

- [x] 1. Spanish glosses present for all tier-3 vocabulary.
      `seed/term_translations.ts` seeds an `es` `TermTranslation` for every tier-3 term
      (53/53). Driver `01` asserts row coverage.

- [x] 2. Display toggles via the student profile `l1_language` field.
      `resolveL1Language` honors `Student.l1Language` (set via the student settings page /
      `PATCH /api/student/settings`) and `ACC-L1-SPANISH`/`ACC-L1-CREOLE` grants;
      `getGlossaryTermsForBenchmark` attaches the L1 gloss only when a language resolves.
      Driver `01` (toggle on/off).

- [~] 3. All Spanish content reviewed and approved before student visibility.
      **Structurally enforced:** only APPROVED `TermTranslation`s are surfaced
      (`getGlossaryTermsForBenchmark`); seeds are `NEEDS_REVIEW`. The **owner approval**
      (review Spanish in `/teacher/content` → bulk-approve `TERM_TRANSLATION`) is the
      remaining manual step. Driver `01` proves a NEEDS_REVIEW gloss is hidden and an
      APPROVED one shows.

- [x] 4. Haitian Creole pipeline functional (content delivery subsequent phase).
      `'ht'` resolves, gates on approval, and displays end-to-end; a proof sample of 8 `ht`
      translations is seeded (bulk content deferred). Driver `01` (ht end-to-end).

`[x]` = complete · `[~]` = code complete; owner approval action pending.

## Owner action (closes item 3)

AI-drafted Spanish/Creole glosses are `NEEDS_REVIEW`. Review in `/teacher/content` and
bulk-approve the `TERM_TRANSLATION` entity to make them visible to students. Translation
*accuracy* is the owner's review responsibility.

## Manual / Tier-3 (deferred — see `docs/audits/deferred/phase-16.md`)

- [ ] `next build` clean; axe e2e on a stimulus/assessment page with an L1 gloss.
- [ ] Manual: set a student `l1Language='es'`, open an assessment with a tier-3 term,
      confirm the Spanish line in the popover; flip the translation to NEEDS_REVIEW →
      disappears; `FEATURE_L1_GLOSSES=false` → no L1 line.

## Verification

- Tier 1: `./node_modules/.bin/tsc --noEmit` = 0 errors.
- Tier 2: `npm run db:seed` then `npm test` — full suite **896/896 green** (incl.
  `audit16` + `l1-glosses` unit tests), stable across repeated runs.
