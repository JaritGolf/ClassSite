# Handoff — multi-teacher content scale-out

**Written:** 2026-08-06, alongside ADR 0023 (class-scoped lesson authoring)
**Status:** Not started. Read this before onboarding a **second teacher account**.

This document is self-contained. A future session should be able to execute from it plus
`CLAUDE.md` and the codebase, without the conversation that produced it.

---

## Why this exists

The authoring work in ADR 0023 was built **class-scoped from day one** — teacher modules and
per-class ordering are correctly owned by a class, and every write is roster-guarded. But the
platform around it is still single-tenant: the shipped curriculum is one shared set of rows with
no owner, and two of its controls are **global and not ownership-checked**.

That is fine while the owner is the only teacher. It stops being fine the moment a colleague gets
an account.

---

## 🔴 BLOCKING — fix before a second teacher exists

### 1. `readyForStudents` is a global switch any teacher can flip

`src/lib/mastery/readiness-flag.ts` → `setBenchmarkReadiness(actorUserId, benchmarkId, boolean)`
writes `Benchmark.readyForStudents`, which is one column on one shared row. The route is
`src/app/api/teacher/benchmarks/[benchmarkId]/readiness/route.ts`:
`requireAuth(['TEACHER','ADMIN'])` + `assertNotSubMode()` — and **no roster guard**.

The module says this is deliberate:

> "Deliberately NOT roster-guarded: a Benchmark is shared curriculum, not a student record."

That reasoning holds for one teacher and fails for two. Today, **any authenticated teacher can
open or withhold any mission for every student on the platform**, and the UI (`ReadinessToggle` on
`/teacher/benchmarks`) presents it as a normal per-teacher control.

It is one half of the playability rule in `src/lib/mastery/availability.ts`:

```ts
export const PLAYABLE_BENCHMARK_WHERE = {
  readyForStudents: true,
  assessments: { some: { assessmentType: 'MASTERY_CHALLENGE', approvalStatus: 'APPROVED', questions: { some: {} } } },
  lessons: { some: { approvalStatus: 'APPROVED' } },
} satisfies Prisma.BenchmarkWhereInput
```

**Fix:** add a per-class layer — e.g. `ClassBenchmarkSettings { classId, benchmarkId, visible }` —
and resolve availability as `global readiness AND (class opinion ?? true)`. Follow the ADR 0023
pattern exactly: absent row = no opinion, roster-guarded writes, pure resolution function. Keep
the global flag as an admin-only content gate.

This is also **phase 2 of the owner's own roadmap** ("per-class mission map control"), so the two
line up.

### 2. The global media kill-switch has the same shape

`POST /api/teacher/lessons/visibility` with `scope: 'global'` sets `LessonStep.enabled` for
everyone, and any teacher can call it. `src/lib/lesson-media/index.ts` restricts it to media step
types but **not** to an owner.

Note the asymmetry already in the codebase — global *content* editing IS correctly admin-only
(`src/app/api/admin/lessons/steps/[lessonStepId]/route.ts` does a manual
`session.user.role !== 'ADMIN'` → JSON 403, deliberately not `requireAuth`'s redirect, so it fails
loudly and testably). The comment there says content rewriting is "higher-stakes" than the
visibility toggle. With multiple teachers, both are equally high-stakes.

**Fix:** move `scope: 'global'` to admin-only, matching global content editing. Teachers keep the
per-class hide, which since ADR 0023 covers every module type and is strictly more useful.
The builder currently surfaces the global switch as *"Turn off for every class on this site"*
(`src/components/teacher/lessons/builder/LessonBuilder.tsx`) — remove that control in the same
change.

---

## 🟠 Structural — no content model has an owner

Grep the schema for `classId|teacherId|createdBy|ownerId`. Among content models, the only hits are
the three ADR 0023 tables (`ClassLessonStepVisibility`, `ClassLessonStep`, `ClassLessonOutline`)
and `UploadedLessonImage.uploadedBy` (a bare string, no FK).

These are all **globally shared with no owner**: `Unit`, `Benchmark`, `BenchmarkClarification`,
`BenchmarkConnection`, `Term`, `TermTranslation`, `Resource`, `Lesson`, `LessonStep`, `Stimulus`,
`StimulusVariant`, `Question`, `QuestionOption`, `Misconception`, `Assessment`,
`AssessmentQuestion`, `RemediationItem`, `Badge`.

Every read path queries them unscoped. Introducing ownership means auditing: the student mission
page, the mission map, `/teacher/lessons`, `/admin/lessons`, the approval queue, all analytics
rollups, CSV exports, the daily report, and the parent summary.

**Recommendation:** do NOT retrofit ownership onto the seeded curriculum. Keep it as the shared,
district-wide baseline and let per-teacher divergence continue to live in the class-scoped overlay
tables. Ownership is only needed for genuinely teacher-*created* top-level content (custom
missions), which does not exist yet.

## 🟠 School scoping is a documented no-op

`src/lib/content-approval/queue.ts` resolves `Teacher.schoolId` and then never filters by it. Its
own comment defers this. `Teacher.schoolId` is nullable and, in practice, unpopulated — it is
meant to come from Clever sync (`docs/oauth-scopes.md`).

For a real district deployment: populate `schoolId` from the roster sync, then scope the approval
queue, the question bank, and any "all teachers" listing by it.

## 🟡 Performance — the roster guard re-queries every call

`getTeacherRoster` (`src/lib/teacher-roster/roster.ts`) runs a full classes + enrollments query,
and `assertClassOwnedByTeacher` calls it **every time**. `src/lib/lesson-editor/edit.ts:126` calls
it in a per-class loop, so a five-period save fired five identical queries before any write.

ADR 0023 added `assertClassesOwnedByTeacher(userId, classIds[])` (one query, fails on the first
unowned class) and the new authoring paths use it. **Remaining work:** sweep the other ~85
`getTeacherRoster` call sites, and consider a per-request memo (React `cache()` would fit the RSC
paths).

## 🟡 Product — sharing between teachers

Not built, and not obviously wanted yet. If it is:

- A teacher module is already a portable unit (`ClassLessonStep`: `stepType`, `title`, `content`,
  all schema-validated). "Copy this module to another class" is a `create` with a new `classId`.
- `siblingGroupId` already models "one module, many classes" — a share could reuse it or
  deliberately break the link so the copy diverges.
- A school-level shared bank needs a real owner column and a visibility rule; see the structural
  section above.

---

## Suggested order

1. Per-class benchmark visibility (blocking #1) — also delivers the owner's phase-2 ask.
2. Global media switch → admin-only (blocking #2). Small.
3. Batch/memoize the roster guard.
4. Populate `schoolId`; scope the approval queue.
5. Sharing, only if the product asks for it.

## Verification

- Tier 1 `tsc --noEmit`; Tier 2 `npm test -- --shard=i/4` (sharded — the full suite in one process
  exhausts Postgres connections).
- New integration coverage must include: teacher B cannot change what teacher A's students see,
  for **each** of the two blocking controls. Model it on
  `tests/integration/class-lesson-authoring.test.ts`, which already sets up two teachers and a
  foreign class.
- In-browser: sign in as two different teacher accounts and confirm a change by one is invisible
  to the other's students.
