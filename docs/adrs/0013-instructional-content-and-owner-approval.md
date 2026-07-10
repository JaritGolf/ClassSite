# ADR 0013 — Instructional content (lessons, remediation) + owner-directed approval at seed

**Status:** Accepted
**Date:** 2026-07-09
**Phase:** 15 (Full Course Expansion, §36.16) + Phase 8 gap repair (§36.9 mission template)

## Context

The owner tested the site and found it could not *teach*: every engine works, but no
instructional content was ever authored. `Lesson`/`LessonStep` existed unseeded, so the
mission flow's Briefing/Key-Terms/Training/Scenario-Lab steps rendered placeholder text;
remediation content was a generated template sentence; and all Tier-C content (Unit 1
question backfill, remediation) sat `NEEDS_REVIEW`, which student-serving paths correctly
filter out. Result: students could be quizzed on Unit 1's original 90 questions and taught
nothing.

The owner directed (2026-07-09): make **Unit 1 the complete turnkey model** — real guided
lessons, real remediation, everything a student needs — with content live immediately, and
enable the already-built Spanish glosses.

## Decisions

1. **Lessons are seed-authored `Lesson` + `LessonStep` rows; no schema change.** One lesson
   per benchmark (`seed/lessons/unit1.ts` via `seed/lessons/_seeder.ts`), ~8 steps:
   NOTE (context) → VOCABULARY (terms in context) → NOTE (core concept) → WORKED_EXAMPLE
   (EOC-style think-aloud, §18 shape) → INTERACTIVE_CHECK → NOTE → INTERACTIVE_CHECK →
   SOURCE_ANALYSIS (reuses the benchmark's Phase-7 stimulus passage + guiding questions).
   Structured step types store JSON validated by zod contracts in `src/lib/lesson-content/`
   (`parseStepContent` falls back to plain text, so legacy/simple rows always render).
   Idempotency uses deterministic ids (`lesson-SS7CG11`, `lstep-SS7CG11-01`) because
   Lesson/LessonStep have no natural unique key — the same pattern as remediation items.

2. **Owner-directed approval at seed (Trust Tier D), scoped to completed units.**
   AI-drafted content for a unit the owner has commissioned as "complete" seeds as
   `approvalStatus: APPROVED`, `sourceTier: D` (the bulk-approve-by-directive tier) via the
   single switch `seed/approval_mode.ts`. This replaces the Tier-C default (`NEEDS_REVIEW`)
   **only** for that scope: Unit 1 lessons, the Unit 1 question backfill, Unit 1 authored
   remediation, and Spanish (`es`) term translations. Unit 2+ drafts (e.g.
   `seed/questions/unit2.ts`) remain Tier C / `NEEDS_REVIEW` until their unit is completed
   under the same directive. Rationale: the owner is the human reviewer; requiring an
   in-app click-through before his own commissioned content goes live makes the site
   non-functional for students (the problem being fixed). The owner reviews in
   `/teacher/content` post-hoc and can mark `NEEDS_REVISION`/`ARCHIVED`. Serving paths
   still filter `APPROVED` everywhere — the gate itself is unchanged.

3. **Lesson interactive checks are ungraded formative self-checks.** Options (with correct
   flags and feedback) live in lesson-step JSON rendered client-side; nothing is persisted,
   no mastery/SM-2 impact. "Server-side grading only" (rule #1) governs *assessments* —
   answer keys must never leak on *secure assessment* payloads; a self-check inside a
   lesson is instructional content, like a textbook's "check yourself" box. Recording this
   scoping here so it is a decision, not drift.

4. **Real remediation content, authored-overrides-generator.** `seed/remediation/unit1.ts`
   authors genuine reteach per (benchmark, skill_tag): concept explanation, ≥2 examples +
   ≥2 non-examples with explanations (§14), optional try-it check — stored as JSON.
   `seed/remediation_items.ts` keeps its DB-derived pair loop: authored content wins and
   seeds per §2 above; unauthored pairs keep the placeholder + `NEEDS_REVIEW` fallback
   (coverage guarantee for audit §36.16 item 6 while authoring catches up).
   `RemediationActivity` parses the JSON and falls back to plain text.

5. **Mission flow renders real content; the 7-step machine is unchanged.** The mission page
   now (a) filters lessons to `APPROVED` (closing a rule-#9 gap — it fetched lessons
   unfiltered) and (b) fetches the benchmark's APPROVED tier-3 Terms. New components:
   `TrainingWalkthrough` (paginated steps, checks gate Next), `VocabPanel` (term cards +
   in-context sentences), `ScenarioLab` (source analysis with guiding questions),
   `LessonStepRenderer`. Source Quest (§10.4) folds into Scenario Lab.

6. **Spanish glosses go live.** `es` translations seed APPROVED under this directive
   (linguistic review = owner post-hoc, consistent with §2); `ht` stays the NEEDS_REVIEW
   proof sample. `FEATURE_L1_GLOSSES=true` in the local env.

## Consequences

- Unit 1 is fully learnable: 6 guided lessons, 30 approved questions/benchmark, real
  remediation, sources, vocabulary, Spanish glosses — the template Units 2–7 repeat.
- Assessment seeding is generalized (`seed/assessments.ts`): every benchmark with enough
  APPROVED questions gets its 5-assessment suite + per-unit Region Challenge, so future
  units need only content files.
- The question-bank shape validator and audit-15 harness become registry-driven
  (`seed/questions/registry.ts`) — new units extend them with zero test edits.
- Deviation risk from §24.1 ("all student-facing content pre-approved") is accepted and
  bounded: approval is still recorded per-row (APPROVED/Tier D at seed = the approval),
  the owner retains post-hoc revision tools, and the directive is documented here.

## Alternatives rejected

- **NEEDS_REVIEW + one-command bulk-approve script:** spec-workflow-pure, but the site
  stays empty until the owner runs it; the owner explicitly chose immediate availability.
- **Manual in-app approval per benchmark:** slowest; the exact bottleneck that left 120
  questions invisible for weeks.
- **A new "lesson player" schema (rich blocks, media):** unnecessary — LessonStep types
  already cover text/example/check/source; videos are out of scope.
