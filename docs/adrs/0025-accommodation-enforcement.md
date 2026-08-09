# ADR 0025 — Accommodation enforcement: every catalog code is now either implemented or honestly labelled

Status: Accepted (2026-08-08)

Supersedes the "Context Boost cards deferred" build decision of 2026-05-29 only
in how it is *surfaced* — the feature itself is still deferred.
Closes the deferred keyboard/touch item from ADR 0016.

## Context

The district approval packet (§9) disclosed that **7 of 15 accommodation codes
had no enforcement code**, and named `ACC-EXT-TIME` and `ACC-REDUCED-CHOICES` as
"unimplemented behavior behind IEP-style labels."

That understated it in one respect. The codes were not merely unimplemented —
they were **grantable, audit-logged, and visually indistinguishable from the
eight that worked**. A teacher transcribing an IEP could open a student profile,
grant Extended Time, receive a green "✓ Granted" chip and an `ACCOMMODATION_SET`
audit row, and reasonably conclude the student had extended time. Nothing in the
product would ever contradict that belief.

The root cause was structural: `seed/benchmarks.ts` (the catalog a teacher grants
from) and the code that acts on a grant were **two unrelated lists**, with nothing
requiring them to agree. Codes could be, and were, added to one and not the other.

A parallel session (PR #14, `ff3b97e`) had already implemented
`ACC-REDUCED-CHOICES` for the assessment path and reworded several catalog
descriptions. This ADR covers the remainder.

## Decision

### 1. A registry owns the mapping, and a test enforces it

`src/lib/accommodations/registry.ts` maps every code to one of three statuses:

| Status | Meaning |
|---|---|
| `enforced` | Code reads the grant and changes behaviour. |
| `satisfied-by-design` | Already true for every student; nothing to switch on. |
| `not-implemented` | Recorded, does nothing yet. Rendered in amber to teachers. |

`tests/integration/accommodations/registry-catalog.test.ts` compares the registry
against the **seeded `Accommodation` rows** — not against a constant, because the
rows are what a teacher actually sees. A code in one list and not the other fails
the build in both directions. This is the part that prevents the gap recurring.

### 2. `ACC-EXT-TIME` is `satisfied-by-design`, not implemented

**Nothing in this platform is timed.** There is no time-limit or duration column
in the schema, no countdown in any component, `AttemptResponse.timeSeconds` is
recorded but never enforced (and no client has ever sent it), and Republic
Challenge "stamina length" is a *question count*, not minutes. Timers are also
ruled out by a standing product rule — they punish absences, which freeze tokens
exist to avoid.

So a 1.5×/2× multiplier would multiply an empty set. Every student already has
unlimited time, which **exceeds** what the accommodation asks for.

Two rejected alternatives:

- **Build a timed mode so the multiplier means something.** This would introduce
  timer pressure the product deliberately avoids, in order to make a label
  literally true. Backwards.
- **Delete the code from the catalog.** A teacher transcribing an IEP looks for
  "extended time"; not finding it reads as the platform ignoring the
  accommodation. The grant is worth recording for documentation.

The registry test asserts this status, so introducing a timed activity later
fails a test and forces an explicit decision about honouring the code.

`ACC-READ-ALOUD` (the button is on every passage for every student) and
`ACC-SCREEN-READER` (ARIA and tab order are application-wide properties, not
per-account ones) are `satisfied-by-design` for the same reason.

### 3. `ACC-REDUCED-CHOICES` extended to every practice surface

It reached only `fetchAssessmentForStudent`. It now also applies in the **Practice
Arena**, the **Daily Drill**, and **remediation alternates** — between them, where
a student spends most of their practice time.

- The correct option is **always** retained; only distractors are dropped. Every
  serving path reads `isCorrect` server-side purely to decide what may be
  dropped, and strips it by explicit field-by-field mapping (never a spread) so
  it cannot reach a payload. Rule #2 holds.
- Eligibility stays the upstream **allowlist** (`PRACTICE`, `PRE_CHECK`,
  `VOCAB_CHECK`, `UNIT_REVIEW`) so a new `AssessmentType` fails **closed**.
- The **Daily Drill is opted in by decision, not by type** — it is not an
  `Assessment` and has no type to check. Documented at the call site because it
  is the one place that bypasses the allowlist.

**Accepted trade-off, disclosed:** a 1-in-3 rather than 1-in-4 guess floor
slightly inflates the SM-2 recall signal, and therefore the decay/spike
analytics, for students holding this grant. Under-accommodating on the surface a
student uses most often is the worse error. Reversible in one line.

Never applied where mastery is decided (Mastery Challenge, Readiness Check,
Republic Challenge, Final Trial): changing the odds of a guess there would change
what the 80% threshold means and make one student's mastery non-comparable to
another's.

### 4. `ACC-CHUNK` and `ACC-T2-VOCAB` implemented

Both were previously described as "available to every student", which is true and
also means the grant did nothing.

- **`ACC-CHUNK`** now sets sentence chunking **on by default**, so the student does
  not have to find and press the button on every passage. **A default, not a
  lock** — unlike high contrast and large text, which are changed in a settings
  page, chunking has a toggle sitting directly on the passage; a button that
  visibly refused to work would be worse than the accommodation choosing the
  starting position. A student's explicit toggle is remembered and wins.
- **`ACC-T2-VOCAB`** keeps tier-2 academic vocabulary popovers on **level-3
  original-source passages**, which otherwise carry no glossary scaffolding at all
  (spec 16.2). Tier-3 civics terms stay hidden there either way — the
  accommodation is scoped to academic vocabulary, matching its name, and glossing
  the civics terms is precisely the scaffolding level 3 exists to withhold.

Delivered through a client context seeded by the RSC student layout, rather than
props threaded through five mount sites. The context defaults to "no
accommodations", which keeps the teacher lesson walkthrough — which renders
student components outside the student layout — showing the unaccommodated view.

### 5. The teacher UI states what each grant does

Each row in the student profile's accommodation editor now carries a status chip
(**Active** / **Already met** / **Not built yet**) with the registry's
teacher-facing sentence behind it. Granting `ACC-CONTEXT-BOOST` now visibly says
it changes nothing yet. This is the actual mitigation for a code that does
nothing: the gap becomes visible at the moment of granting.

### 6. `ExplainerHover` reaches keyboard and screen-reader users

`aria-describedby` was set **only while the popover was open**, so a screen-reader
user — who never fires a mouse hover — could not reach any of the ~150 explainers
on the site.

- The text now renders into an always-present `sr-only` node that owns the id,
  with `aria-describedby` set permanently. The visual popover is `aria-hidden`,
  so the sentence is not announced twice.
- The description carries **`text` only, not `title: text`** — the title is
  frequently the trigger's own words, so including it made a screen reader say it
  twice in a row. (Caught by a component test finding the string duplicated.)
- `onFocus`/`onBlur` open and close it. React's synthetic focus events bubble, so
  focusing an inner nav link or button works **without this wrapper adding a tab
  stop or a nested interactive role** — which a blanket `tabIndex={0}` +
  `role="button"` would have done to every nav item.
- A new opt-in **`focusable`** prop gives non-interactive triggers (chips, stat
  labels, table headers) a real tab stop plus Enter/Space/tap. Off by default, so
  no existing call site changes; deliberately not applied where the child is a
  link, since a click handler there would swallow navigation.

## Consequences

- **Zero codes are silently unenforced.** 11 enforced, 3 satisfied-by-design, 1
  labelled not-implemented.
- The district packet §9 disclosure needs narrowing — it currently overstates the
  gap.
- `ACC-CONTEXT-BOOST` remains the only outstanding accommodation feature.
- Manual screen-reader testing is still outstanding and is *not* closed by this
  change; the automated work removes a hard blocker, not the need to test.
- A future timed activity will fail the `ACC-EXT-TIME` registry test — by design.
