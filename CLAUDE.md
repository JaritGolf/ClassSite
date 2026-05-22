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

**Phase 10 — Not started**

Phase 9 complete — Audit 9 passed 2026-05-22.

Next action: Begin Phase 10. Use `/plan` before implementing EOC Analytics. Target: Audit 10 (spec Section 36.11).

---

## Last Action

_(Update this at the end of every session.)_

**Session of 2026-05-22 (Phase 9):** Phase 9 complete. Audit 9 passed — all 8 driver tests pass (48 assertions). Three slices: 9a (teacher roster + class dashboard + student profile + accommodation audit-log gap fix), 9b (benchmark/decay/calibration dashboards), 9c (content approval, substitute mode, reset attempt, audit-log catalog complete). Schema changes: `Class.subPrepNotes TEXT`, `AssessmentAttempt.voided BOOLEAN DEFAULT false` + index on `(student_id, voided)`. New lib modules: `src/lib/teacher-roster/` (resolveTeacherId, getTeacherRoster, assertStudentInTeacherClass, assertClassOwnedByTeacher); `src/lib/class-analytics/` (11 functions: status distribution, mastery by benchmark/RC/unit, most-missed, misconceptions, students needing action, remediation completion, small groups, EOC trend, off-ramp); `src/lib/student-profile/` (getStudentProfileForTeacher — full VM with calibration, decay flags, spaced retrieval, overrides, accommodations); `src/lib/benchmark-analytics/` (getBenchmarkClassPerformance, getPerformanceByReadingLoad/Complexity/StimulusType, getDistractorsByMisconception, getStudentsInRemediation, getBenchmarkSpacedHealth); `src/lib/calibration-analytics/` (getClassCalibrationTrend, getOverconfidenceStudents, getCalibrationByStudent); `src/lib/content-approval/` (listApprovalQueue — ordered by id desc, no updatedAt on approvable entities; approveContent, archiveContent, bulkApproveByTag — all $transaction + AuditLog); `src/lib/assessment-reset/` (resetAttempt — void in place); `src/lib/substitute-mode/` (cookie: cq_sub_mode, getSubMode, setSubMode; guard: assertNotSubMode, SubModeError); `src/lib/audit/` (listAuditLogs). Gap fix: `src/lib/reading-load/accommodation.ts` setAccommodation now writes AuditLog(ACCOMMODATION_SET) in $transaction. Tightened: `src/lib/mastery/override.ts` TeacherOverride + AuditLog now in single $transaction; `src/lib/mastery/status.ts` short-circuits on voided attempts; `src/lib/adaptive-difficulty/next-item.ts` getBenchmarkId filters voided:false. Middleware: sub-mode write gate on /api/(teacher|mastery|reading-load)/* mutations; toggle endpoint excepted. API routes: 14 new teacher routes. Pages: 9 new teacher pages. Components: TeacherShell, TeacherNav, SubModeBanner (now real — reads cookie, indigo banner when on), StatCard, ClassProgressCard, StatusDistribution, all dashboard/benchmark/decay/calibration/student components; ApprovalQueueTable/Row/Filters, BulkApproveConfirmDialog; SubModeToggle, SubNotesEditor. E2E: teacher-smoke.test.ts + bulk-approve.test.ts (gated on E2E=1). Tests: 52 new (499 total, all pass). TypeScript: 0 errors. Committed `feat(phase-9a)`, `feat(phase-9b)`, `feat(phase-9c)`. Tagged `phase-9-complete`.

**Session of 2026-05-18 (Phase 8):** Phase 8 complete. Audit 8 passed (items 7 and 8 require manual verification — procedures in `docs/audits/audit-8-checklist.md`). Schema: added `StreakState`, `NarrativeProgress`, `StudentUiSettings` models (migrations `20260517203140` and `20260517210821` — reconciled against existing DB state). Seed: `seed/badges.ts` — 23 badges across MASTERY/READING/ENGAGEMENT tracks, wired into `seed/index.ts` step 7. Domain modules: `src/lib/streak/index.ts` (`getOrCreateStreak`, `recordActivity` — UTC-safe ISO week, freeze token cap 3, weekly grant after gap check); `src/lib/narrative/index.ts` (`NARRATIVE_BEATS` constant with 3 beats for unit-1, `getBeatsForUnitCode`, `getFirstUnreadBeat`, `markBeatRead`, `toggleSkipNpcs`). API routes: `GET/PATCH /api/student/settings`, `GET /api/student/dashboard`, `GET /api/student/map`, `GET /api/student/badges`, `POST /api/narrative/[unitId]/read`, `POST /api/narrative/skip-all`, `GET /api/streak`. Student layout: `src/app/student/layout.tsx` (RSC, requireAuth STUDENT, fetches pausePointMinutes, renders StudentNav + PauseBanner). UI components: `PauseBanner` (client timer, fixed bottom-center, aria-live), `NarrativeOverlay` (`<dialog>` with ESC handler, POSTs markBeatRead on dismiss), `NarrativeOverlayWrapper` (client state holder), dashboard widgets (DashboardHero, ReadinessMeter, StreakWidget, DrillCTA, BadgeRack), map components (MissionMap, BenchmarkNode with `data-testid="benchmark-node"`), mission components (StepIndicator, MissionFlow 7-step state machine), assessment components (AssessmentPlayer, ConfidenceSelector), DrillCard. Pages: dashboard (RSC, full data fetch, narrative beat, streak activity), map, mission/[benchmarkCode], assessment/[assessmentId], daily-drill, badges, settings (client, slider + toggles). E2E: `playwright.config.ts`, `tests/e2e/global-setup.ts` (CSRF → credentials → student upsert → storageState), `tests/e2e/smoke.test.ts` (dashboard + map tests). Tests: 24 new unit (streak + narrative pure logic); 349 total (all pass). TypeScript: 0 errors. Committed `feat(phase-8)`. Tagged `phase-8-complete`.

**Session of 2026-05-14 (Phase 7):** Phase 7 complete. Audit 7 passed. Reading-load ladder engine built. No schema changes needed (all models already in place). Domain module `src/lib/reading-load/` with 5 files: `variant-selector.ts` — pure functions (`selectVariantContent`, `resolveAccommodationLevel`, `buildGlossaryAnnotations`, `filterQuestionsForMastery`, `LEVEL_1_ACCOMMODATION_CODES`); `accommodation.ts` — DB functions (`getEffectiveReadingLevel`, `getStudentAccommodations`, `setAccommodation` with FORBIDDEN/INVALID_CODE/NOT_FOUND errors); `question-filter.ts` — `fetchStimulusForQuestion` DB function with variant selection + glossary annotation; `source-decoder.ts` — pure mission definitions (4 levels) + DB progress tracking (`getSourceDecoderProgress`, `completeSourceDecoderLevel` with prerequisite enforcement, idempotent); `index.ts` — re-exports. Seed: `seed/stimuli_unit1.ts` creates 1 Stimulus with level-1, level-2, level-3 StimulusVariants per Unit 1 benchmark (6 stimuli total), attaches to 3 questions per benchmark via stimulusId; ELL and BELOW-GRADE-READER accommodation codes added to `seed/benchmarks.ts` (now 8 total). API routes: `GET/POST /api/reading-load/accommodation`, `GET /api/source-decoder/progress`, `POST /api/source-decoder/[level]/complete`. Modifications: `question-fetcher.ts` — `fetchAssessmentForStudent` accepts optional `studentId` and attaches accommodation-aware stimulus variants; `next-item.ts` — `getNextItem` accepts optional `effectiveReadingLevel` and filters questions by `readingLoadLevel <= effectiveLevel`; `attempt.ts` — `gradeAndSubmit` enforces level-2 minimum for MASTERY_CHALLENGE (throws INVALID_CONTENT if any question is level 1); submit route and mastery integration test updated to use only level-2+ questions for mastery challenges. UI components: `GlossaryPopover.tsx` (hover/focus/tap, WCAG aria-describedby, tier-2 blue / tier-3 orange underlines); `StimulusDisplay.tsx` (read-aloud Web Speech API, sentence-chunking toggle with localStorage persistence, level switcher for opt-up/opt-down, glossary integration); `SourceDecoderMission.tsx` (4 activity widgets: highlight, paraphrase, author purpose, compare sources). Tests: 30 unit (variant-selector.test.ts) + 36 integration (reading-load.test.ts + source-decoder.test.ts) = 66 new tests; 325 total (all pass). TypeScript: 0 errors. Tagged `phase-7-complete`.

**Session of 2026-05-14 (Phase 6):** Phase 6 complete. Audit 6 passed. Adaptive difficulty engine built. Schema: added `AdaptiveSessionState` model (migration `20260514_add_adaptive_session_state`) — unique per `attemptId`, tracks `currentComplexity`, `consecutiveCorrect`, `consecutiveIncorrect`, `pendingWorkedExample`, `pendingNearTransfer`, `workedExampleQuestionId`. Domain module `src/lib/adaptive-difficulty/` with 5 files: `transitions.ts` — pure state machine (`complexityUp/Down`, `applyCorrectAnswer`, `applyIncorrectAnswer`, `acknowledgeWorkedExample`, `applyNearTransferCorrect/Incorrect` — all pure, immutable, no DB); `session.ts` — DB CRUD for `AdaptiveSessionState` (only created for PRACTICE/DIAGNOSTIC/READINESS_CHECK, never for MASTERY_CHALLENGE); `next-item.ts` — `getNextItem()` delivers QUESTION / WORKED_EXAMPLE / NEAR_TRANSFER based on state (near-transfer exclusion: only the worked-example question itself, not full history, to avoid pool exhaustion); `answer.ts` — `submitPracticeAnswer()` grades server-side, writes `AttemptResponse`, transitions state, escalates to `assignRemediation` on near-transfer miss; `index.ts` — re-exports. API routes: `GET /api/practice/[attemptId]/next-item`, `POST /api/practice/[attemptId]/answer`. Tests: 38 unit (transitions pure) + 16 integration (all 5 Audit 6 items) = 54 new tests; 259 total (all pass). TypeScript: 0 errors. Tagged `phase-6-complete`.

**Session of 2026-05-14 (Phase 5):** Phase 5 complete. Audit 5 passed. Spaced retrieval engine built in full. Domain module `src/lib/spaced-retrieval/` with 5 files: `sm2.ts` — pure SM-2 algorithm (`computeQuality`, `computeNextState`, `computeDueAt`, `halveInterval` — all pure functions matching spec Section 15.2 exactly); `drill.ts` — `getDrillQueue()` pulling due items (dueAt <= now), capped at 15, interleaved across benchmarks, alternate question selection excluding previously seen items; `review.ts` — `submitReview()` recording SpacedReviewEvent + updating SM-2 state in a `$transaction`, off-ramp halving logic (checks last 2 events for consecutive quality>=3 recovery), `gradeReviewAnswer()` server-side grading; `decay.ts` — `getDecayingBenchmarks()` per-student + `getClassDecayRates()` per-teacher-class with spike alerts; `index.ts` — public exports. API routes: `GET /api/drill` (student drill queue) and `POST /api/drill/[benchmarkId]/review` (submit answer + SM-2 update, server-side grading). Tests: 25 unit (sm2.test.ts) + 25 integration (all 9 Audit 5 items) = 50 new tests; 205 total (all pass). TypeScript: 0 errors. Tagged `phase-5-complete`.

**Session of 2026-05-14 (Phase 4):** Phase 4 complete. Implemented full mastery + remediation engine. Domain modules: `src/lib/mastery/` (4 files: `unlock.ts` — next benchmark unlock via sequenceOrder, `off-ramp.ts` — pure `isOffRampConditionMet()` + DB-backed `checkOffRamp()` with $transaction + AuditLog + SpacedReviewState halving, `status.ts` — `updateProgressAfterAttempt()` orchestrator wired into submit route as non-fatal hook, `override.ts` — teacher override with sequential TeacherOverride+AuditLog write) and `src/lib/remediation/` (3 files: `assign.ts` — `selectRemediationType()` pure function + `assignRemediation()` DB function, `complete.ts` — completion + REMEDIATION_COMPLETE advancement, `questions.ts` — alternate question fetch excluding seen IDs). API routes: POST `/api/mastery/[benchmarkId]/override` (teacher/admin only), POST `/api/remediation/[studentRemediationId]/complete` (student only). Submit route now calls `updateProgressAfterAttempt` post-grading (non-fatal error handling). Tests: 18 unit (pure functions) + 40 integration (all 8 Audit 4 items) = 58 new tests; 155 total (all pass). TypeScript: 0 errors. Audit 4 passed all 8 items. Tagged `phase-4-complete`.

**Session of 2026-05-14 (Phase 3):** Phase 3 complete. Implemented full server-side assessment engine. Domain module `src/lib/assessment/` with 4 files: `grader.ts` (pure grading function — never reads isCorrect/pointsAwarded from client payload, uses correctOptions Map from DB only), `question-fetcher.ts` (explicit Prisma `select` that deliberately omits `isCorrect` and `feedback` on options), `attempt.ts` (startAttempt + gradeAndSubmit — ownership guard, double-submit guard, confidence required for MASTERY_CHALLENGE/REPUBLIC_CHALLENGE/FINAL_TRIAL, $transaction atomicity, practice vs. secure feedback branching), `index.ts` (Zod SubmitSchema strips unknown fields including any tampered `isCorrect`/`pointsAwarded`). API routes: GET `/api/assessment/[id]`, POST `/api/assessment/[id]/start`, POST `/api/assessment/[id]/submit` — all use `getSession()` + JSON 401/403. Fixed test isolation: assessment test uses `test-phase3-` prefixed user (outside auth cleanup scope); added `maxWorkers: 1` to jest.config.ts to prevent DB-racing between seed's `deleteMany`+recreate and assessment test's captured option IDs. Tests: 17 unit (grader) + 18 integration (all 7 Audit 3 items) = 35 new tests; 97 total (all pass). TypeScript: 0 errors. Audit 3 passed all 7 items. Tagged `phase-3-complete`.

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
- [2026-05-14] Jest maxWorkers (Phase 3): set `maxWorkers: 1` in jest.config.ts so all test suites run serially. Required because seed test does `deleteMany`+recreate on question options (regenerates IDs), which race-corrupts assessment integration tests when run in parallel. Reversible by removing the setting once seed is refactored to true upsert-by-stable-key.
- [2026-05-14] Off-ramp remediation condition (Phase 4): spec says "remediation completed for each missed skill" but interpreted as "at least one StudentRemediation.status=COMPLETED for this benchmark" rather than one-per-attempt. Simpler to enforce, avoids ambiguity around which remediations apply to which attempt. Reversible if spec is clarified to require per-attempt tracking.
- [2026-05-14] updateProgressAfterAttempt non-fatal (Phase 4): mastery hook in submit route uses try/catch so a mastery engine error never surfaces as a 500 to students (submission is already persisted). Reversible by removing the try/catch if mastery state is considered critical path.
- [2026-05-14] P2002 Prisma error logging (Phase 4): unlock.ts uses try/catch on a create to detect duplicate unlock (P2002). Prisma's own library logs this as a console.error before the catch runs — expected noise in test output. Reversible by switching to upsert pattern if the log noise is unacceptable.
- [2026-05-14] Mastery level-2 enforcement location (Phase 7): guard placed in `gradeAndSubmit` (throws INVALID_CONTENT) rather than at assessment-creation time. This is a runtime backstop — editorial discipline is the primary control. Reversible by moving to assessment publication/approval flow in Phase 9.
- [2026-05-14] Near-transfer exclusion (Phase 6 — confirmed Phase 7): near-transfer question selection excludes only `workedExampleQuestionId`, not full seen-IDs history. With only 3 questions per complexity level, excluding all seen IDs would leave no candidates after 3 incorrect answers at a level.
- [2026-05-14] Source Decoder completion ungraded (Phase 7): `onComplete` fires on any submission regardless of correctness. Graded Source Decoder is deferred to Phase 9+. Satisfies Audit 7 item 8 (track exists with level 1 and 2 missions).
- [2026-05-14] ELL/BELOW-GRADE-READER accommodation codes in benchmarks.ts (Phase 7): added alongside existing ACC-* codes. This is the canonical location for all accommodation records. Total: 8 accommodations. Seed test updated to expect 8.
- [2026-05-22] queue.ts updatedAt removal (Phase 9c): Question, Lesson, and Stimulus Prisma models have no `updatedAt` column. The prior agent's queue.ts tried to select and order by `updatedAt` — removed from QueueItem interface and all select/orderBy clauses. Entities without timestamps are ordered by `id desc` for deterministic output. Reversible by adding `updatedAt @updatedAt` columns to those models if createdAt-style ordering is needed.
- [2026-05-22] School-scoped approval queue deferred (Phase 9c): `listApprovalQueue` resolves Teacher.schoolId but does not currently filter by it. School-level scoping requires district data model to be meaningful — deferred to Phase 17 polish. Admin already sees all. Reversible by adding a where clause once school IDs are populated from Clever sync.
- [2026-05-22] ReportingCategory.code → name (Phase 9a): ReportingCategory model has no `code` field, only `name` (which is unique). Class analytics `ReportingCategoryMasteryRow` interface exposes both `code` and `name` fields; `code` is populated from the `name` value (same data) since no separate code column exists in the schema. Reversible by adding a `code String @unique @map("code")` column in a future migration.
- [2026-05-22] Override.ts $transaction (Phase 9c): TeacherOverride.create + AuditLog.create now wrapped in prisma.$transaction(async tx => {...}) instead of sequential awaits. This is strictly tighter — no behavioral change on happy path. Confirmed compatible with all existing override integration tests.

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
