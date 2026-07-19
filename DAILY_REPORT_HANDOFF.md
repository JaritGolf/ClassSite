# Handoff: Daily Class Report in the Reports tab

**For:** Claude Code, running locally in this repo (`~/Documents/Class site`).
**Status:** Code is written to disk and type-checks clean. It is **NOT committed**.
It was authored in a sandboxed environment that could not run the local Postgres,
`jest`, or the dev server — so it has **not been run live or tested against the DB
yet**. Your job: get it running, verify it, fix anything that breaks, and (on owner
sign-off) commit it.

Owner (Arthur) reports he restarted `npm run dev` but **does not see the new UI**.
The most likely cause is a stale `.next` build cache or `next start` (prod) instead
of `next dev` — see "If the changes don't show" below. Please diagnose that first.

---

## What was requested

A per-class report the teacher opens each day that (a) summarizes what's happening
with every student in that class and (b) gives a prioritized plan of what to address
for that class that day. It must live in the **Reports** tab of the teacher UI.

Owner's chosen scope (via clarifying questions):
- Placement: **in-page tabs** on `/teacher/reports` — "Daily Plan" and "Mastery Reports".
- Content: **both** a per-student roster table **and** a prioritized action plan.
- No scheduled job — the page is live/on-demand only.

## What was built

New class-scoped domain module + UI, following existing repo conventions (RSC page
fetches data via a lib builder; dumb server components render; one client component
for interactivity; `ExplainerHover theme="admin"` for jargon; `assertClassOwnedByTeacher`
for authz). **No schema change. No new dependencies.**

### Files added
- `src/lib/daily-report/report.ts` — `buildDailyClassReport(teacherUserId, classId)`,
  returns a `DailyClassReport` VM. Authorizes with `assertClassOwnedByTeacher` (throws
  `RosterError('FORBIDDEN')` for a class the caller doesn't own). Scopes every query to
  the selected class's `studentIds` (via `getTeacherRoster().classes`). Composes:
  per-student roster rows (current mission, mastered count, spaced-review items due
  today, attention flags), a prioritized `actionPlan` (off-ramp → decay spike →
  remediation overdue → small-group reteach → overconfidence → drill backlog),
  re-scoped small groups (`getRecommendedSmallGroups` filtered to this class),
  `computeClassReadiness(classId)`, and a status summary + headline counts.
- `src/lib/daily-report/index.ts` — barrel (types + `buildDailyClassReport`).
- `src/components/teacher/reports/ClassPicker.tsx` — **client**; `<select>` that sets
  the `classId` search param (keeps `tab=daily`).
- `src/components/teacher/reports/DailyActionPlan.tsx` — **server**; renders the
  prioritized action list, category badges + `ExplainerHover`, affected student names.
- `src/components/teacher/reports/DailyRosterTable.tsx` — **server**; per-student grid,
  flagged students first, links to `/teacher/students/[id]`.
- `tests/integration/daily-report.test.ts` — class-scoping, IDOR (FORBIDDEN for a class
  you don't own), off-ramp flag + action item, due-today count, empty-class report.

### Files changed
- `src/app/teacher/reports/page.tsx` — rewritten with tabs. `?tab=daily` (default) shows
  the class picker + stat strip + action plan + roster table for the selected class
  (defaults to the teacher's first class). `?tab=mastery` shows the original
  whole-roster mastery-by-category / mastery-by-benchmark tables (unchanged content).
  Reads `searchParams` (Next 14 — sync object). `ReportActions` (CSV + print) unchanged.

The "Reports" nav item already prefix-matches `/teacher/reports`, so no nav change.

---

## Verify (please run these on the host)

1. **Types** (Tier 1, blocking):
   ```
   npm run typecheck
   ```
   Expect 0 errors. (Only the new files were added; nothing else was touched.)

2. **Tests** (Tier 2, blocking) — run with the dev server STOPPED (the repo has known
   Postgres connection contention when the dev server is up):
   ```
   npm test -- daily-report
   ```
   Then the full suite to confirm no regression:
   ```
   npm test
   ```

3. **Live walk** — `npm run dev`, sign in as a teacher, open
   `http://localhost:3000/teacher/reports`. Confirm:
   - Lands on **Daily Plan** with a class/period picker.
   - Switching classes re-scopes the report (roster + action plan change).
   - **Mastery Reports** tab still shows the two original tables.
   - Authz: a teacher cannot load another teacher's class (the builder throws FORBIDDEN;
     the picker only lists their own classes, but confirm a hand-crafted `?classId=`
     for a non-owned class doesn't render data).
   - If the demo DB has an off-ramp / decaying / overdue-remediation student, confirm
     they're flagged in the table and appear in "Address today".

## If the changes don't show (owner's current issue)

Diagnose in this order:
1. Confirm the process is `next dev`, not `next start` (prod serves a frozen `.next`).
2. Stale cache: `rm -rf .next && npm run dev`, then hard-refresh (Cmd+Shift+R).
3. Watch the dev terminal on page load for `✓ Compiled /teacher/reports` vs a red
   compile error — if it errors, that's the real bug; fix it.
4. Confirm no second copy of the repo / a different port is what the browser is hitting.
5. Sanity-check the file on disk really is the new version:
   `grep -n "Daily Plan" src/app/teacher/reports/page.tsx` (should match the tab label).

Note: this repo lives in an iCloud-synced folder with `node_modules -> node_modules.nosync`;
if you hit dataless/"Resource deadlock" file reads, materialize the file first.

---

## Conventions / guardrails (from CLAUDE.md)

- Tiered gate (ADR 0006): Tier 1 `tsc` + Tier 2 `jest` are blocking; `next build` /
  axe / manual a11y are non-blocking (deferred ledger).
- Server-side authz only; answer keys never leak (this feature is aggregate/status data
  only — no question options, no per-item `isCorrect`, no distractor content — same
  posture as `src/lib/export/`). Keep it that way if you extend it.
- **Do not commit until the owner signs off.** When approved, suggested message:
  `feat(phase-9): daily class report — per-class roster + prioritized action plan in Reports tab`
  Then update the **Current Build Phase** + **Last Action** sections of `CLAUDE.md`.

## Known follow-ups / not done
- No "Daily plan CSV" export was added (owner may want one; the existing CSV + Print
  buttons still work on the page).
- The action-plan thresholds are constants at the top of `report.ts`
  (`DRILL_BACKLOG_THRESHOLD`, `DECAY_SPIKE_PERCENT`, `REMEDIATION_OVERDUE_DAYS`,
  `OVERCONFIDENCE_GAP`, etc.) — tune to taste.
- Small groups reuse the whole-roster `getRecommendedSmallGroups` filtered to the class;
  if you later want per-class misconception grouping computed from scratch, that's the
  place to change.
