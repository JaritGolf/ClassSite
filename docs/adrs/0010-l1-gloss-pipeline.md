# ADR 0010 — L1 gloss pipeline: reuse TermTranslation, AI-draft → owner-approve, approval-gated display

**Status:** Accepted
**Date:** 2026-06-12
**Phase:** 16 (L1 Glosses, §36.17)

## Context

Phase 16 adds first-language (L1) glosses (Spanish for all tier-3 civics terms, plus a
functional Haitian Creole pipeline). The `Term` / `TermTranslation` tables and
`Student.l1Language` already existed (MVP schema), so the work was wiring, not schema.

## Decisions

1. **Reuse `TermTranslation`; no schema change.** Translations are rows keyed by
   `[termId, languageCode]` with their own `approvalStatus`.

2. **AI-draft → owner-approve (Trust Tier C, per ADR 0009).** Translations seed as
   `approvalStatus: NEEDS_REVIEW`. Display is gated to APPROVED, so nothing reaches a
   student until the owner (or a language-proficient reviewer) approves it. The harness
   guarantees *presence + pipeline*; the owner guarantees *linguistic correctness* —
   important given the district context.

3. **Resolve language from profile OR accommodation.** `resolveL1Language` prefers
   `Student.l1Language`, else an `ACC-L1-SPANISH`/`ACC-L1-CREOLE` grant; returns null when
   `FEATURE_L1_GLOSSES` is off. Single resolve point used by the assessment player and the
   Source Lab.

4. **Single glossary-term source.** `getGlossaryTermsForBenchmark(benchmarkId, languageCode)`
   returns APPROVED Terms (+ global) with the APPROVED L1 gloss attached. The pure
   `buildGlossaryAnnotations` carries `l1Definition`/`l1Language` through to the popover.

5. **Fixed the assessment glossary gap.** The assessment player previously passed `[]` for
   glossary terms, so no popovers appeared during assessments. It now sources terms via the
   helper. Display-only — does not touch server-side grading.

6. **Feature flag `FEATURE_L1_GLOSSES`.** Default ON; set `false` to disable instantly
   during a pilot without a code change.

## Consequences

- Schema-free; no new dependency. Approval flows through the existing content-approval
  tooling (new `TERM_TRANSLATION` approvable entity in entity-map / queue / bulk-approve /
  approve).
- Test-infra hardening landed alongside: a `connection_limit` cap (`tests/jest.setup.ts`)
  bounds Prisma's pool so a full serial run can't approach Postgres `max_connections` — this
  resolved nondeterministic cross-suite failures the added DB load exposed.

## Alternatives rejected

- **A dedicated translations model / per-language columns:** unnecessary — `TermTranslation`
  already models exactly this.
- **Showing AI translations immediately:** violates §36.17 item 3 and the Tier-C rule.
