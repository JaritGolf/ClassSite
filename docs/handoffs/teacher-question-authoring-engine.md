# Handoff — teacher question & assessment authoring engine

**Written:** 2026-08-06, alongside ADR 0023 (class-scoped lesson authoring)
**Status:** Not started. Deliberately deferred — this is the largest and riskiest remaining piece.

This document is self-contained. A future session should be able to execute from it plus
`CLAUDE.md` and the codebase, without the conversation that produced it.

---

## The goal

Let a teacher author their own **graded** questions, so a teacher-created mission can carry a real
Mastery Challenge and count toward mastery.

ADR 0023 shipped teacher-authored *lesson modules*, including "Quick check" questions — but those
are **ungraded and client-local** (ADR 0013). They never touch mastery, SM-2, or EOC readiness.
That is why they were safe to ship. Graded questions are a different animal.

---

## 🔴 BLOCKING PREREQUISITE — the seeder will silently rewrite live assessments

`seed/assessments.ts` reconciles existing rows destructively:

```ts
if (!same) {
  await tx.assessmentQuestion.deleteMany({ where: { assessmentId: args.existingId! } })
  await tx.assessmentQuestion.createMany({
    data: args.questionIds.map((questionId, i) => ({
      assessmentId: args.existingId!, questionId, sequenceOrder: i + 1, points: 1.0,
    })),
  })
}
```

The allocator picks questions from the pool of **APPROVED questions on that benchmark**. So the
moment a teacher-authored question becomes APPROVED on a seeded benchmark, the computed allocation
differs, `same` is false, and the next `npm run db:seed` **rewrites the question set of every live
assessment on that benchmark — including Mastery Challenge forms students have already sat.**

Assessment row ids are preserved, so attempt history survives by FK; what changes is *which
questions those assessments contain*. There is no warning and no audit row.

`seed/index.ts` says as much in its own header:

> "A full `db:seed` ends in `assessments`, which RECONCILES existing rows — it rewrites the
> AssessmentQuestion set of every live assessment in place."

**Fix this first.** Two viable shapes:

1. **Exclude teacher content from the allocator.** Add `Question.authoredByUserId` (or a
   `teacherAuthored` boolean) and filter it out of the seed allocator's pool. Cleanest — the
   district's forms stay exactly as seeded.
2. **Adopt the lesson guard pattern.** `seed/lessons/_seeder.ts` already does this for lessons:
   `Lesson.structureEditedAt` freezes a lesson's step list forever, and
   `LessonStep.contentEditedAt` freezes one step's content. An `Assessment.formEditedAt` would
   freeze a form the moment a human touched it.

Option 1 is preferable: it keeps teacher questions out of a shared district artifact entirely,
which is also the right answer for the multi-teacher case.

---

## 🔴 Rule #3 — every question needs 10 tags

From `CLAUDE.md`, non-negotiable rule 3:

> Required tags: benchmark, reporting_category, cognitive_complexity, stimulus_type,
> reading_load_level, skill_tag, misconception_id, remediation_tag, source_tier, approval_status.
> Untagged content does not ship.

Enforced by `validateQuestionTags` in `src/lib/eoc-alignment/`, and asserted over every active
Unit-1 question by `tests/integration/eoc-alignment/seed-tagging.test.ts`
(`expect(offenders).toEqual([])`).

A teacher-facing authoring UI has to collect all ten. Realistically:

| Tag | Source |
|---|---|
| `benchmarkId`, `reportingCategoryId` | inferred from the mission being authored |
| `sourceTier` | fixed — teacher content is its own tier (see below) |
| `approvalStatus` | workflow, not a field the teacher picks |
| `readingLoadLevel`, `cognitiveComplexity`, `stimulusType`, `itemType` | teacher picks; needs plain-language labels, exactly as ADR 0023 did for module types |
| `skillTag`, `remediationTag` | **constrained pick, not free text** — see the audit15 trap below |
| `misconceptionId` | must reference the 50-entry Appendix E inventory (`Misconception.code`) |

**Consider a new `SourceTier` value for teacher-authored content.** The existing tiers (A = FDOE
released, B = reviewed bank, C = AI draft, D = bulk-approve-by-tag) don't describe "written by the
classroom teacher", and analytics that segment by tier would silently lump it in with something
else.

---

## 🔴 Nothing in the app can create an Assessment or a Question today

Grep `src/` for `prisma.question.create`, `prisma.assessment.create`, `questionOption.create` —
there are none. The only writes to those models are `approvalStatus` flips via
`src/lib/content-approval/`. `/teacher/questions` and `/api/teacher/questions` are read-only
browsers.

And a mission is invisible without one. `src/lib/mastery/availability.ts`:

```ts
export const PLAYABLE_BENCHMARK_WHERE = {
  readyForStudents: true,
  assessments: { some: { assessmentType: 'MASTERY_CHALLENGE', approvalStatus: 'APPROVED', questions: { some: {} } } },
  lessons: { some: { approvalStatus: 'APPROVED' } },
} satisfies Prisma.BenchmarkWhereInput
```

So a teacher-created mission with no approved Mastery Challenge renders `COMING_SOON` forever. Any
"teacher creates a graded mission" story needs assessment authoring, not just question authoring.

---

## 🟠 Global test assertions that teacher questions WILL break

These query the **whole database**, not the seeded set. Each needs scoping (preferred) or a
constraint on teacher authoring.

**`tests/integration/seed.test.ts`** — fully unscoped, no `where` clause:

```ts
it('each question has exactly 1 correct option', async () => {
  const questions = await prisma.question.findMany({ include: { _count: { select: { options: true } } } })
  for (const q of questions) { /* expects exactly 1 isCorrect */ }
})

it('each question has exactly 4 options', async () => {
  const questions = await prisma.question.findMany({ include: { _count: { select: { options: true } } } })
  for (const q of questions) { expect(q._count.options).toBe(4) }
})
```

Any teacher question with 3 or 5 options fails these. Also in the same file: `benchmark.count()
=== 36`, `unit.count() === 7`, `reportingCategory.count() === 4`, and a Unit-1 `externalKey` regex
(`/^q-SS7CG1[1-6]R?-\d{3}$/`) applied to **every** question on a Unit-1 benchmark — a teacher
question with a null or free-form external key fails immediately.

**`tests/integration/audit15/01-course-expansion.test.ts`** — per benchmark, over ALL its
questions:

- reading-load ratio bands (level 1 must be 0.25–0.35, level 2 0.45–0.55, level 3 0.15–0.25)
- cognitive-complexity ratio bands
- `validateQuestionTags` over every question, `expect(missing).toEqual([])`
- **≥1 `RemediationItem` per distinct `skillTag` on the benchmark**

That last one is the trap: **a teacher inventing a new `skillTag` breaks the suite immediately**
unless they also author matching remediation. Constrain `skillTag` to a picklist derived from
existing remediation, or auto-create a remediation stub.

**`tests/integration/assessment-allocation.test.ts`** — the global idempotency snapshot:

```ts
it('re-running the seeder is a no-op (idempotent reconciliation)', async () => {
  const snapshot = await prisma.assessmentQuestion.findMany({ orderBy: [...] })  // ALL rows
  await seedMissionAssessments(prisma)
  expect(after).toEqual(snapshot)
})
```

This is the same blocking issue as §1, expressed as a test. Fixing the allocator fixes this.

---

## 🟠 Rule #2 — answer keys never leak

`src/lib/assessment/question-fetcher.ts` is the single choke point:

```
 * SECURITY GUARANTEE: fetchSafeQuestions NEVER includes `isCorrect` or
 * `feedback` in the returned data.
```

```ts
options: {
  select: {
    id: true,
    optionText: true,
    // isCorrect: DELIBERATELY OMITTED
    // feedback:  DELIBERATELY OMITTED (returned post-submission for practice only)
  },
}
```

**Authoring order is itself a latent answer key.** Every authored bank lists the correct option
first, which is why `seededShuffle` (`src/lib/shuffle.ts`, seeded on `studentId:questionId`)
exists. Any new authoring path must preserve the shuffle — if a teacher-authored question ever
bypasses `fetchSafeQuestions`, "the answer is A" comes straight back.

Regression tests to keep green: `tests/integration/assessment.test.ts:170`, `mastery.test.ts:1125`,
`adaptive-difficulty.test.ts:312-358`, `republic-challenge/session.test.ts:225`,
`attempt-review.test.ts:163` — all assert `expect(opt).not.toHaveProperty('isCorrect')`.

## 🔴 Rule #1 — do NOT reuse the lesson-check mechanism for graded questions

`LessonStep.content` (and, since ADR 0023, `ClassLessonStep.content`) is shipped **verbatim to the
student's browser**, including `INTERACTIVE_CHECK` options with `correct: true` and their
feedback. That is acceptable only because those checks are ungraded, client-local, and have zero
mastery impact (ADR 0013).

Reusing that shape for graded teacher questions would break rule #1 **silently** — no test would
fail, and the answer key would simply be in the page source. Graded questions must go through
`Question`/`QuestionOption` and `fetchSafeQuestions`, full stop.

---

## Recommendation on analytics

**Teacher-authored graded questions should NOT feed EOC readiness.**

`computeStudentReadiness` / `computeClassReadiness` are blueprint-weighted against the real
Florida EOC, and the calibration loop (ADR 0007) correlates them with actual EOC outcomes. Mixing
in locally-authored items of unvalidated difficulty would degrade a signal the whole platform —
and the district packet — is built on, and would corrupt the calibration correlation.

Suggested split: teacher questions may drive **mastery of a teacher-created mission** and appear
in class analytics, but are excluded from EOC readiness and from the calibration inputs. Make that
exclusion explicit and test it.

---

## Suggested order

1. Allocator guard so the seeder cannot rewrite live forms (blocking).
2. Scope the global test assertions listed above.
3. `Question` authoring: schema (author column + tier), domain module, validation, tag picklists.
4. Assessment authoring: create a Mastery Challenge from authored questions.
5. Analytics exclusion + its tests.
6. Teacher UI — reuse the ADR 0023 vocabulary approach (plain-language names for every enum).

## Verification

- Tier 1 `tsc --noEmit`; Tier 2 `npm test -- --shard=i/4` (sharded).
- A teacher-authored question must be provably absent from: EOC readiness, calibration inputs, and
  the seed allocator's pool.
- Re-run `npm run db:seed` twice with teacher questions present and assert the live assessment
  forms are byte-identical before and after — that is the specific failure this handoff exists to
  prevent.
- Answer-key leak probe on the new path: fetch a teacher-authored assessment as a student and
  assert no `isCorrect` anywhere in the response.
