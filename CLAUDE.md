# Civics Quest — Standing Instructions for Claude Code

> Read this file at the start of every session. Update the **Current Build Phase**, **Last Action**, and **Open Questions** sections at the end of every session.

---

## What This Project Is

Civics Quest: Build the Republic is a Florida 7th Grade Civics mastery-learning platform with an EOC-readiness focus. Students experience it as a game ("Build the Republic"). Teachers experience it as an LMS with deep analytics. The owner is a classroom teacher building this independently for use in his own classroom and eventually his district.

Target users: 7th grade students, classroom teachers, parents/guardians, district admins.

District context: Palm Beach County School District. Significant Spanish-speaking and Haitian Creole-speaking populations.

## Source of Truth

The build specification is `civics_quest_v3_build_spec.md` at repo root. **When in doubt, that document wins.** This `CLAUDE.md` is the always-read summary; the spec is the detail.

If you find this file and the spec in conflict, the spec is correct and this file should be updated.

---

## Non-Negotiable Rules

These are decided. Do not relitigate them mid-build. If you think one of them is wrong, stop and surface the concern before acting.

1. **Server-side grading only.** All grading and unlock decisions happen server-side. The client is never trusted. Tampered client payloads must be detected and rejected.
2. **Answer keys never leak.** Question option keys must never appear in API responses to a student before submission of a secure assessment.
3. **Every question must be fully tagged.** Required tags: benchmark, reporting_category, cognitive_complexity, stimulus_type, reading_load_level, skill_tag, misconception_id, remediation_tag, source_tier, approval_status. Untagged content does not ship.
4. **Mastery threshold is 80%.** Off-ramp triggers after 3 failed attempts plus completed remediation plus 7 days elapsed. Off-ramp is not failure — it unlocks next benchmark and increases spaced review frequency.
5. **Spaced repetition uses SM-2.** Do not substitute FSRS or other algorithms. The mapping from (correctness × confidence) to SM-2 quality is in spec Section 15.2.
6. **Confidence ratings required on Mastery Challenges, Republic Challenge, and Daily Republic Drill.** Three-level scale: "Not sure" / "Pretty sure" / "Very sure." No percentages or numerical scales for 7th graders.
7. **Build in phase order.** Run the audit checkpoint at each phase boundary (spec Section 36). Do not begin Phase N until Phase N-1 audit passes. If a Phase N-1 audit failure surfaces during Phase N, stop and report.
8. **PostgreSQL only** (SQLite acceptable only for local prototype). Clever-first SSO, Google fallback. Mock auth for dev only — never in production.
9. **No third-party analytics or telemetry on student data.** No PII in URL parameters or query strings. Encrypt in transit (TLS 1.2+).
10. **Accessibility is a first-class requirement, not polish.** Read-aloud, sentence chunking, tier-2 vocabulary popovers ship in MVP. WCAG 2.1 AA target. Accommodations are profile attributes that flow through every assessment.

---

## How to Work This Codebase

### Required Reading Order at Session Start

1. This file.
2. `civics_quest_v3_build_spec.md` — Section relevant to current phase.
3. `git status` and `git log -5` — confirm clean tree and recent state.
4. The audit checklist (spec Section 36) for the current phase.

### Model Selection

- **Sonnet 4.6 (default):** CRUD endpoints, React components, dashboard pages, Tailwind styling, schema migration scaffolding, test scaffolding, mission/lesson/UI work.
- **Opus 4.7 (for hard problems):** Architecture decisions, the assessment/mastery/remediation engines, the SM-2 scheduler, blueprint-weighted question selection, calibration logic, debugging when Sonnet has gotten stuck.

Switch with `/model` mid-session as appropriate.

### Use `/plan` Before

- Schema changes that touch existing tables.
- Implementing the assessment, mastery, remediation, spaced retrieval, adaptive difficulty, or calibration engines.
- Any change touching authentication, authorization, or audit logging.
- Adding a new external dependency.

### Stop and Ask Before

- Adding any new external paid service or SaaS dependency.
- Deviating from PostgreSQL or the auth provider order.
- Introducing third-party state-management libraries beyond what comes with Next.js.
- Adding analytics or telemetry that transmits any student data outside this app's database.
- Touching anything labeled "Phase X" before phase X-1 audit has passed.
- Schema decisions affecting existing data.
- Anything that touches accessibility, accommodations, or privacy.

### Phase Boundary Discipline

At each phase boundary:

1. Run all tests for the phase.
2. Run the audit checklist for the phase.
3. Update **Current Build Phase** and **Last Action** sections of this file.
4. Commit: `feat(phase-N): complete phase N — [brief summary]`.
5. Tag: `git tag phase-N-complete`.
6. Update `docs/architecture.md` if architecture decisions were made.
7. Add an ADR in `docs/adrs/NNNN-title.md` for any non-trivial decision.

### Commit Conventions

Conventional commits with phase reference: `feat(phase-5): implement SM-2 scheduler`, `fix(phase-3): server-side tamper rejection`, `chore(phase-3): pass audit 3`.

### Known Pitfalls (Do Not Repeat)

- Do not use client-side mastery calculation. Server-side only.
- Do not include `is_correct` in the question options API response when serving secure assessments.
- Do not skip `due_at` indexing on `spaced_review_state` — the daily drill query must be fast.
- Do not reset SM-2 state on Mastery Challenge re-attempts; only the daily review and calibration logic update SM-2 state.
- Do not auto-apply EOC calibration weight changes — admin approval required.
- Do not include third-party analytics scripts that transmit student data.
- Do not use timer-based UI patterns that punish students for absences (use freeze tokens).
- Do not display public individual score leaderboards.
- Do not expose item-level distractor analysis to parents.

---

## Required Repo Structure

Maintain this layout. Files in `src/lib/` are domain modules; cross-module imports go through their public `index.ts`.

```
/
├── CLAUDE.md                          # this file
├── civics_quest_v3_build_spec.md      # source of truth
├── README.md
├── package.json
├── .env.example
├── .gitignore
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── seed/
│   ├── benchmarks.ts
│   ├── reporting_categories.ts
│   ├── misconception_inventory.ts
│   ├── vocabulary.ts
│   └── sample_questions_unit_1.ts
├── src/
│   ├── app/                            # Next.js App Router routes
│   ├── components/
│   ├── lib/
│   │   ├── assessment/
│   │   ├── mastery/
│   │   ├── remediation/
│   │   ├── spaced-retrieval/
│   │   ├── adaptive-difficulty/
│   │   ├── eoc-analytics/
│   │   └── auth/
│   ├── server/
│   └── types/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docs/
    ├── architecture.md
    ├── adrs/
    └── runbook.md
```

---

## Current Build Phase

**Phase 2 — Not started**

Phase 1 complete — Audit 1 passed 2026-05-09.

Next action: Begin Phase 2. Use `/plan` before implementing auth. Implement Clever OAuth, Google OAuth fallback, mock auth (dev only), role middleware (student/teacher/parent/admin), base routing, session encryption. Target: Audit 2 (spec Section 36.3).

---

## Last Action

_(Update this at the end of every session.)_

**Session of 2026-05-09 (Phase 1):** Phase 1 complete. Implemented full Prisma schema (45 models, all Section 27 tables, FK constraints, indexes). Created and applied migration `20260509202124_phase_1_initial_schema`. Wrote all 5 seed scripts: reporting_categories (4), benchmarks/units/accommodations (7 units, 6 benchmarks, 6 accommodations), misconception_inventory (50), vocabulary (85 terms), sample_questions_unit_1 (90 questions × 360 options, 15 per benchmark, full tagging: benchmark, reporting_category, cognitive_complexity, reading_load_level, skill_tag, remediation_tag, misconception_id, source_tier B, approval_status APPROVED). All seeds idempotent. Added ts-node dev dependency for Jest TypeScript config. Wrote 29 integration tests (tests/integration/seed.test.ts) — 29/29 pass. Migration verified on fresh DB via prisma migrate reset. TypeScript: 0 errors. Audit 1 passed all 10 items. Tagged `phase-1-complete`.

---

## Open Questions

Surface any decisions where the spec was silent and you had to make a judgment call. Material questions go to the human; non-material ones get noted here and proceeded with.

### District / Policy (need human confirmation before relevant phase)

- Palm Beach County approval process for custom instructional applications — confirm before any pilot use.
- Clever app integration scopes — confirm allowed data scopes before Phase 2 production wiring.
- Google OAuth allowed as fallback for students and teachers — confirm before Phase 2.
- External parent login permissions and identity verification — confirm before Phase 18.
- Hosting/security requirements for student progress data — confirm before Phase 17.
- Whether actual EOC scores can be imported for calibration — confirm before Phase 13.
- Whether AI-assisted item drafting is allowed under district policy — confirm before relying on Tier C content path.
- Whether class-level Republic build (relatedness mechanic) is acceptable under classroom norms — confirm before Phase 8.

### Build Decisions (resolve as encountered)

_(Add entries as the agent makes judgment calls. Format: `[date] [topic]: [chose X over Y because Z; reversible if A].`)_

- [2026-05-09] PostgreSQL hosting (Phase 0): chose Homebrew local install (PG 16.13) over Docker or hosted dev DB. Fastest to unblock, offline, free. Reversible by changing `DATABASE_URL`. See ADR 0001.
- [2026-05-09] next-auth version (Phase 0): chose v4 (stable) over v5/Auth.js (newer API, less battle-tested). Reversible at Phase 2 implementation — evaluate upgrade then. See `docs/architecture.md`.

---

## Glossary (for fast reference)

| Term | Meaning |
|---|---|
| Benchmark | A single SS.7.CG standard (e.g., SS.7.CG.1.1). Student-facing name: "Mission." |
| Reporting Category | One of the four EOC blueprint groupings (Origins/Citizens/Policies/Organization). Student-facing name: "Republic Pillar." |
| Mastery Challenge | The benchmark assessment that determines unlock of the next benchmark. 80% threshold. |
| Off-Ramp | Status applied after 3 failed mastery attempts + remediation + 7 days. Unlocks next benchmark; increases spaced review frequency; flags teacher. Not failure. |
| Daily Republic Drill | Student-facing name for the daily SM-2 spaced retrieval queue. |
| Republic Challenge | Student-facing name for cumulative EOC-style review. |
| Final Republic Trial | Full-length EOC simulation at the end of the year. |
| Reading-Load Level | 1 (paraphrase + glossary), 2 (chunked excerpt, EOC-equivalent), 3 (raw passage). |
| Source Decoder Track | Parallel mini-progression for stimulus-reading skills. |
| Strategist Track | Parallel mini-progression for test-taking strategy. |
| Misconception Inventory | The 50-entry list in spec Appendix E. Each distractor on a question should map to a misconception code where applicable. |
| Tier 2 / Tier 3 Vocabulary | Tier 2 = academic verbs (analyze, evaluate, contrast). Tier 3 = civics-specific (federalism, ratify). Both glossed in-app. |
| Trust Tier | Content approval pathway: A (auto-approved FDOE), B (reviewed bank), C (AI draft, always Needs Review), D (bulk-approve-by-tag). |

---

## Quick Phase Map

| Phase | Focus | Audit |
|---:|---|---:|
| 0 | Project setup, env, repo inventory | 36.1 |
| 1 | Schema, migrations, seeds (benchmarks, reporting categories, misconceptions, vocab, Unit 1 questions) | 36.2 |
| 2 | Auth (Clever, Google, mock), roles, base routing | 36.3 |
| 3 | Assessment engine (server-side grading, attempts, confidence capture) | 36.4 |
| 4 | Mastery + remediation engines (status, lock/unlock, off-ramp, diagnostic remediation) | 36.5 |
| 5 | Spaced retrieval engine (SM-2, daily drill, decay detection) | 36.6 |
| 6 | Adaptive difficulty (within-session 3/3 rule, worked examples) | 36.7 |
| 7 | Reading-load ladder (variants, accommodations, Source Decoder) | 36.8 |
| 8 | Student game UI (dashboard, map, mission, drill, badges, narrative) | 36.9 |
| 9 | Teacher LMS (dashboards, approval, bulk-approve, intervention) | 36.10 |
| 10 | EOC analytics (RC, stimulus, complexity, reading-load, decay, calibration) | 36.11 |
| 11 | Republic Challenge (review modes, blueprint weighting, stamina, simulation) | 36.12 |
| 12 | Accessibility & equity polish (WCAG 2.1 AA, accommodations wiring) | 36.13 |
| 13 | Calibration loop (EOC score import, correlation analysis) | 36.14 |
| 14 | Parent progress summary | 36.15 |
| 15 | Full course expansion (all benchmarks, 30 questions each) | 36.16 |
| 16 | L1 glosses (Spanish then Haitian Creole) | 36.17 |
| 17 | District readiness polish (audits, exports, privacy review, SSO) | 36.18 |
| 18 | Parent login | 36.19 |

---

**End of standing instructions.** Read the spec for detail, run the audits, build with care.
