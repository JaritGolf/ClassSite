# ADR 0022 — One ranked "next step" resolver for student guidance

- **Status:** Accepted (code complete, owner review pending)
- **Date:** 2026-08-05
- **Phase:** 8/9 (student game UI)
- **Supersedes:** the dashboard's four-CTA layout and the four Mission-Map dead ends

## Context

The owner's requirement: student navigation should be seamless and friction-free, and
the platform should heavily guide students on what to do next — **before and after a
lesson, not only inside one**. "The platform as a guide to learning" needed to be much
more strongly expressed.

Two concrete failures stood in the way.

**1. Nothing ranked the dashboard's calls-to-action.** `ContinueLastActivity` ("Pick up
where you left off"), `DashboardHero` ("Continue Mission"), `DrillCTA` ("Start Drill")
and an assigned-remediation card all rendered at near-identical visual weight. Two of
them were near-duplicates. A 12-year-old was not guided; they guessed.

**2. Every terminal screen dead-ended into the Mission Map.** The app knew what came
next and declined to say so:

| Surface | Old behaviour |
|---|---|
| Mastery Challenge passed | "Next mission unlocked. Head to the Mission Map!" — it knew *which* mission |
| Mastery Challenge failed | "Remediation has been assigned" + a **Mission Map** button — it assigned specific work and did not link to it |
| Daily Drill finished | "See you tomorrow!" — ended the session mid-class |
| Remediation, no reassessment authored | "Back to Mission Map" |
| Mastery Challenge step | Navigated *out* to `/student/assessment/[id]`, discarding mission context at the moment of completion |

There was also no "before the lesson" framing at all: students landed straight in an
ungraded Pre-Check with no statement of what the mission covered or how long it took.

## Decision

Extend the pattern `src/lib/mastery/availability.ts` already established — one shared
module owning a question every surface used to answer for itself — from *"which mission
is open"* to *"what should this student do next"*.

**`src/lib/student-next-step/`**: a pure ranker (`rank.ts`), a single DB loader
(`load.ts`) composing existing domain modules, and types that double as the wire
contract for `GET /api/student/next-step`.

Ranking order, and the reasoning:

1. `REMEDIATION` — the engine assigned it after a failure and it gates the off-ramp
   (rule #4). Targeted work outranks self-directed work.
2. `MISSION_RESUME` — work already in flight. Resuming beats starting something new.
3. `DRILL` — short and time-sensitive (SM-2 due dates); it decays if deferred.
4. `MISSION_START` — a fresh mission. Where a brand-new student lands.
5. `STRATEGY` — only when a teacher set a requirement and it is owed.
6. `REPUBLIC_CHALLENGE` — optional review, once something has been mastered.
7. `ALL_CAUGHT_UP` — genuinely nothing left.

`StudentPlan.primary` is **non-nullable**: an empty ranking collapses to
`ALL_CAUGHT_UP` rather than to nothing, so the platform always has an answer and no
consumer has to handle a null.

Consumed by the dashboard (one dominant `NextStepCard` + a quiet ordered `ThenList`),
and by one shared `NextStepHandoff` on all four terminal screens.

## Consequences

### Deliberate deletions

`ContinueLastActivity`, `DashboardHero` and `DrillCTA` were **removed**, not left in
place. They are exactly the competing calls-to-action the owner asked us to eliminate,
and leaving them would have rebuilt the problem at a smaller scale.

The 2026-07-25 "pick up where you left off" feature is **preserved, not dropped**:
`getLastActivityForStudent` became a ranking input. It supplies the resume phrasing and,
via the `LAST_ACTIVITY` kind, surfaces the parallel tracks the ranker does not model
(Source Decoder levels, a specific Republic Challenge mode) — deduped on `href` so it
never restates the primary step.

### The integrity regression this had to avoid

Moving the Mastery Challenge inside the mission flow means passing `onComplete` to
`AssessmentPlayer`. That component inferred "needs the fullscreen Focus Mode gate" from
the **absence** of that callback (`isEmbedded = !!onComplete`). The inference was safe
only while nothing embedded a high-stakes assessment — the moment the Mastery Challenge
moved in, it would have **silently downgraded Focus Mode from fullscreen-gated to
ungated** (ADR 0020).

Fixed by deciding from the server-provided assessment type instead:
`HIGH_STAKES_ASSESSMENT_TYPES` in `assessment/wire.ts`, with

```
requireFullscreen = secureMode && (!isEmbedded || highStakes)
```

computed **once** and used for both the hook argument and the Begin-gate render (they
were two copies of the same expression; entering fullscreen needs a user gesture, so if
the hook demands it and the gate never renders, fullscreen never happens). The `||`
form means the standalone behaviour of every existing type is unchanged — this can only
ever add the gate, never remove it. Verified live: embedded Mastery Challenge shows the
gate with questions hidden; embedded Readiness Check renders questions immediately while
Focus Mode stays armed.

### Estimates are nominal, and say so

Only the drill estimate is derived from real data (the due-item count). Mission length
is scaled to the content actually present (`estimateMissionMinutes`), and everything
else is a fixed constant in one documented table. All are rendered as "about N min".
`StudentActivitySession.areaSeconds` holds real per-area timings and could replace them
with per-student medians later.

### Attempt semantics preserved

The embedded Mastery Challenge is still gated behind an explicit "Begin Mastery
Challenge" click, because mounting `AssessmentPlayer` POSTs `/start` and creates an
`AssessmentAttempt`. Rendering it on step arrival would create a row per visit.
(`AssessmentAttempt.passed` is nullable with no default, so an abandoned attempt cannot
count as a failure toward the 3-strike off-ramp — but the click gate keeps the intent
explicit regardless.)

### Freshness

Callers fetch the plan *after* their submit resolves, which is safe because
`POST /api/assessment/[assessmentId]/submit` awaits `updateProgressAfterAttempt` before
responding — the unlock and any newly assigned remediation are already persisted. The
route sends `Cache-Control: no-store`; a stale plan is precisely the dead end this
module exists to remove.

### One mission-step list

`STEP_ORDER` (MissionFlow) and `STEPS` (StepIndicator) were parallel lists that could
drift, and the teacher walkthrough kept a third copy. All three now read
`mission-steps.ts`, which also adds `gradeNote` — the question 7th graders actually ask
about every screen ("does this count?"), previously only implied and only on some steps.
Rendering each step's explainer visibly is a small accessibility gain too: that copy was
hover-only, the acknowledged ADR 0016 WCAG deviation.

### Nav badges are deliberately not the resolver

The student layout computes **two cheap indexed counts** for the nav badges. Calling
`getStudentPlan` there would add its availability queries to every student page render.
Badges carry `sr-only` text ("Daily Drill, 3 questions due") — never a colour or glyph
alone (rule #10).

## Alternatives rejected

- **A priority banner above the existing cards.** Smallest change, but the four
  competing CTAs would have remained — the actual complaint.
- **A "Today's Plan" checklist with no dominant card.** Reads as a to-do list; the owner
  chose one unmissable action plus a short ordered follow-on list.
- **Auto-advancing after a countdown.** Zero clicks, but it takes control away from the
  student and disorients.
- **Storing the next step.** It is cheap to derive and derivation cannot go stale — the
  same reasoning as `availability.ts`.

## Verification

`tsc --noEmit` 0 errors. Full suite green, sharded ×4. New: 31 pure ranker + wire-contract
tests, 12 integration tests against the real DB, 13 component tests, plus a mutation
check (pointing the CTA back at the Mission Map fails a test). Live walk as student and
teacher including the Focus Mode matrix above, the failed-mastery handoff resolving to a
real assigned remediation, zero external request origins, and high-contrast neutralisation
of every new surface.
