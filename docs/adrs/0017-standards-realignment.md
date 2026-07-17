# ADR 0017 — Standards Realignment: Benchmarks Remapped to the Official SS.7.CG Meanings

**Date:** 2026-07-16
**Status:** Accepted (owner-approved plan; decisions via AskUserQuestion)

## Context

Cross-checking `seed/benchmarks.ts` against the authoritative Florida SS.7.CG
statements (CASE knowledge graph via the Learning Commons MCP connector,
retrieved 2026-07-16) revealed a systemic misalignment: **strand-1 benchmark
content followed the pre-2021 SS.7.C course sequence relabeled with the new
SS.7.CG codes.** Official 1.1 is "ancient Greece, ancient Rome and the
Judeo-Christian tradition"; the seed's 1.1 was Enlightenment (officially 1.4).
Of the 11 strand-1 codes, only 1.10 matched its official meaning. Strands 2–3
were mostly aligned, with three wrong-topic defs (2.4, 2.7, 3.12) and several
partial reframes — all on content-free rows.

Every question inherits `benchmarkCode`, so all ~250 shipped questions were
tagged with codes whose official EOC meaning differed — compromising rule #3
(full tagging), EOC-readiness analytics, teacher benchmark dashboards, and the
future Phase-13 calibration loop. The file's own header ("the exact official
blueprint must be re-verified before production") anticipated exactly this.

## Decision

**Hybrid remap, executed 2026-07-16:**

1. **Strand 1 — row-identity-preserving relabel.** All shipped content and
   student data hang off the eleven strand-1 rows, so rows were RENAMED in
   place (`applyBenchmarkCodeRealignment` in `seed/benchmarks.ts`): a two-phase
   (LEGACY:: temp codes), title-gated, transactional rename pass that also
   migrates `ConfidenceCalibrationSnapshot.scope` strings. Row ids — and
   therefore questions, lessons, assessments, attempts, SM-2 state, and
   student progress — survive untouched. The renames form a permutation:
   old 1.1→1.4, 1.2→1.3, 1.3→1.5, 1.4→1.6, 1.5→1.7, 1.6→1.1 (repurposed),
   1.7→1.8, 1.8→1.11, 1.11→1.2 (repurposed); 1.9 and 1.10 kept their codes.
2. **Strands 2–3 — def rewrites in place** (content-free rows): full topic
   replacements for 2.7 (constitutional qualifications for office), 3.12
   (compare U.S. and Florida constitutions), 2.4 (how the Constitution
   safeguards rights); reframes for 2.1, 2.5, 2.6, 2.8, 2.9, 2.10, 3.1, 3.2,
   3.4, 3.5, 3.6, 3.15.
3. **Old-1.6 bank split item-level** (owner choice): its 30 Constitutional
   Convention/ratification questions were reassigned by topic — 18 convention
   items to 1.7, 12 ratification items to 1.10. `externalKey`s are FROZEN
   (`q-SS7CG16-*` now live on 1.7/1.10) — renaming keys would orphan rows and
   attempt history.
4. **Interim content authored for official 1.1 and 1.2** (owner choice): the
   two repurposed rows received full interim blocks — 30 fully-tagged
   questions each (`seed/questions/unit1_interim.ts`, `R`-infix keys), a
   text-first lesson each (`seed/lessons/unit1_interim.ts`, flagged
   `interim: true` — exempt from the ADR 0015 media-step requirement ONLY),
   tier-3 terms with Spanish glosses, and authored remediation — so numeric
   mission order works immediately (an empty first mission would block
   sequential unlock). **The owner has flagged both blocks for a FULL content
   build later** (tracked in the CLAUDE.md backlog). Approval: APPROVED /
   Tier D per ADR 0013.
5. **Guardrail:** `seed/official_standards.ts` snapshots all 36 verbatim
   official statements (+ topical anchors); every `BenchmarkDef` carries
   `officialStatement` sourced from it, and
   `tests/unit/seed/benchmark-standards-alignment.test.ts` pins the code set,
   statement identity, anchors, numeric sequence, and strand→category mapping.
   MCP is not callable from jest, so the snapshot is checked in — refresh only
   from the authoritative source.

## Supporting mechanics

- **Lessons follow content, not codes:** `LessonSeedDef.idKey` pins each
  carried lesson's original lesson/step row ids while `benchmarkCode` carries
  its official code — resume pointers survive. Interim lessons use a distinct
  `R` id space.
- **Questions move on re-seed:** both question seeders' upsert *update* paths
  rewrite `benchmarkId` (the legacy `seedSampleQuestions` previously didn't).
- **Remediation reconciles by (benchmarkId, skillTag)**, not by code-derived
  id, preserving `StudentRemediation` FKs; stale unreferenced items are
  cleaned up.
- **Vocabulary upserts by (term, tier)** (guarded unique) so moved terms
  update in place; 28 terms reassigned topically, 6 added.
- Clarifications are now rewritten (delete + recreate) each seed run — the old
  create-once guard silently never propagated changes; connections are rebuilt
  from defs.

## Consequences

- Unit 1 = official 1.1–1.6, Unit 2 = 1.7–1.11, `sequenceOrder` = numeric code
  order. Two rows changed units (old-1.5 → unit-2; old-1.11 → unit-1).
- Bank status: 1.1–1.6 and 1.8 complete (30 each); 1.7 at 48; **1.10 at 12
  (top-up to 30 in backlog); 1.9 and 1.11 empty (backlog).**
- Content-authoring workflow change: future waves anchor on
  `seed/official_standards.ts` (KG-verified wording), making this drift class
  a test failure instead of a discovery.
- Cosmetic key/id mismatches are permanent and intentional (frozen
  `externalKey`s, `lesson-SS7CG16` on 1.10, `remitem-SS7CG15-*` on 1.7).
- The demo classroom was regenerated (owner-approved); `remediateBenchmark` in
  the demo driver now passes readiness before failing mastery attempts (the
  server-side gate applies to seeded actors like real students).

## Verification (2026-07-16)

`tsc` 0 errors; `npm run db:seed` on the live dev DB — 9 renames fired, row
ids preserved, second run a no-op (idempotent); full jest **1309/1311 passed,
2 intentional skips (interim media exemption), 129 suites**, twice, dev server
stopped; demo regenerated; browser walk as Alex (realigned mission map, interim
1.1 mission mastered end-to-end through the real engine) and as Ms Teacher
(dashboard attributes Enlightenment misses to 1.4; benchmark list shows
official titles).
