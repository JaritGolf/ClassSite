# ADR 0020 — Assessment integrity: in-app Focus Mode, device lockdown stays in device management

Status: Accepted (2026-07-30)

## Context

The owner asked whether students can be locked out of all other computer
functions while on the platform, to stop them from opening a tab and looking up
answers during assessments. Students use district-managed Chromebooks.

The premise cannot be satisfied by this codebase. A web page has no API that
locks a Chromebook — the capability lives in the device-management layer
(Google Admin console, and whatever classroom-management tool the district
licenses). Google's own "locked mode" is a Google Forms feature and is not
available to third-party web applications.

Investigation found two viable district-side paths, both requiring zero code:
a **GoGuardian Teacher Scene** (allow list + tab limit of 1 — Palm Beach County
already licenses GoGuardian) and a **ChromeOS single-app Web Kiosk** via Google
Admin. Both are documented in `docs/chromebook-lockdown.md`.

That left the question of what the *app* should do. Doing nothing would be a
disservice: the app can enforce some things, observe others, and — most
usefully — make a teacher aware of what happened.

## Decision

1. **The hard lock is out of scope for the app, and documented rather than
   half-built.** `docs/chromebook-lockdown.md` is written to be handed to
   district IT, including the allowlist trap (locking to the app domain alone
   breaks lesson video, which embeds `youtube-nocookie.com`) and the
   accessibility constraints a careless policy would violate.

2. **The app ships Focus Mode: enforce what a browser can, record what it
   cannot.** On secure assessments it requests fullscreen behind a Begin gate,
   blocks copy/cut/paste/right-click, and records departures
   (`AttemptIntegrityEvent`).

3. **Never auto-punish. The app flags; the teacher decides.** No attempt is
   voided, no score adjusted, no progression blocked. This follows the
   platform's existing posture — off-ramp is not failure, no timer-based
   punishments — and reflects that the signal is genuinely ambiguous: a student
   may have been interrupted, and the record cannot see a phone or a second
   device. The teacher gets a **Focus** flag on the attempt row next to the
   existing Void control.

4. **Warn the student, in plain language, at the moment it is recorded.** An
   `aria-live` notice says what was noted and that their answers are safe.
   Surveillance a student cannot see is not something to build into a 7th-grade
   product; the deterrent only works if they know, and a student who left by
   accident deserves to know it was noticed.

5. **Two gates, both off by default.** `FEATURE_SECURE_ASSESSMENT` (env, master
   kill switch) **and** `Class.secureAssessmentMode` (teacher opt-in per class).
   With the flag unset the feature is entirely inert and the player behaves
   byte-identically to before.

6. **Coverage is all six `SECURE_ASSESSMENT_TYPES`** (owner's choice) —
   MASTERY_CHALLENGE, REASSESSMENT, REPUBLIC_CHALLENGE, FINAL_TRIAL,
   READINESS_CHECK, DIAGNOSTIC. **Narrowing:** when the player is *embedded* in
   the mission flow (pre-check / readiness), it records and blocks but does not
   seize the screen — forcing fullscreen mid-mission is a bad experience, and
   readiness checks are formative and retried. Standalone high-stakes
   assessments get the full treatment.

7. **One event per away episode, and short episodes are discarded.** A single
   tab switch fires both `blur` and `visibilitychange`; the client collapses
   them so the server never double-counts. Episodes under `MIN_AWAY_MS` (750ms)
   are dropped as noise — a stray click on browser chrome is not someone
   looking up an answer, and false positives would destroy the teacher's trust
   in the signal, which is the only thing that makes the feature worth having.

8. **Accommodations are exempt by construction.** `ACC-BREAKS` and the
   `PauseBanner` actively tell students to step away. Focus Mode provides a
   **Take a break** control that hides the questions and records nothing at all.
   Flagging a student for using an accommodation the app offered would be a
   defect, not a policy choice.

9. **Text selection is NOT disabled.** `user-select: none` would break
   Select-to-Speak, screen-reader text navigation, and the glossary popovers —
   a real accommodation regression for a marginal deterrent. Copying is blocked
   at the `copy` event instead.

10. **The record is deliberately thin.** It stores *that* focus was lost and
    roughly for how long — never where the student went. No URL, no tab title,
    no screenshot, no keystrokes. `recordedAt` is the server clock (the wire
    contract has no timestamp field), while `durationMs` is client-reported and
    therefore advisory, never authoritative.

11. **`SECURE_ASSESSMENT_TYPES` moved to the wire module.** It was a private
    const inside the server-only `attempt.ts`; both sides now need it. Three
    client/server contract drifts have already shipped in this codebase, so the
    set has exactly one definition and the integrity payload is built through
    `buildIntegrityReportBody` with a contract test parsing its output through
    the route's own schema.

## Rejected alternatives

- **A force-installed Chrome extension with device attestation.** The only path
  to a lock the *app* could require: an extension using
  `chrome.enterprise.deviceAttributes` (available only to force-installed
  extensions on managed ChromeOS) attesting to the page via
  `externally_connectable`, letting `startAttempt` refuse an unattested device.
  Rejected for v1 — it means authoring, signing, distributing and maintaining a
  Chrome extension through district IT, for a district that already owns a tool
  that solves the problem today. Recorded here as the known upgrade path.

- **Auto-voiding after repeated exits.** Explicitly rejected by the owner. It
  would punish accidental exits and assistive-technology interactions, and it
  puts an irreversible academic consequence behind a signal that is advisory by
  construction.

- **Live proctoring / real-time teacher alerts.** GoGuardian already shows
  teachers live student screens. Rebuilding a worse version of a tool the
  district owns is not a good use of the build.

- **Stamping an integrity verdict onto the attempt row.** Keeping events in
  their own table means the summary (and its thresholds) can be re-tuned
  without a migration, and guarantees the data cannot leak into grading.

## Consequences

- New table `attempt_integrity_events` and column `classes.secure_assessment_mode`
  (migration `20260730140000_assessment_integrity`, additive).
- New domain module `src/lib/assessment-integrity/`; the notable/minor
  thresholds live in one pure, unit-tested file (`summary.ts`).
- Integrity data is **excluded from the parent portal**. It is exactly the
  behavioural category the parent VM allowlist exists to keep out; the
  forbidden-field guards assert it.
- Retention: events are deleted with their voided attempt under
  `VOIDED_ATTEMPT_RETENTION_DAYS`. They have no separate window because they are
  incidental context attached to an attempt, not a data class an admin reasons
  about on its own.
- The feature is inert until an owner sets the env flag *and* a teacher opts a
  class in.

## Deferred

- Force-installed extension attestation (above).
- Class-level integrity rollup on the teacher dashboard; v1 is the student
  profile only, since review is post-hoc and per-attempt.
- Per-class resolution for students enrolled in multiple classes — currently the
  first ACTIVE enrollment wins, the same limitation the strategy track carries.
