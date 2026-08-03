# Locking Down Chromebooks During Assessments

**Audience:** the classroom teacher and district IT. This document can be handed
to IT as-is.

**The one thing to understand first:** a website cannot lock a Chromebook. No
web application can — the capability belongs to the device-management layer
(Google Admin console and whatever classroom-management tool the district
licenses). My Civics Class ships an in-app **Focus Mode** (see
`docs/adrs/0020-assessment-integrity-and-device-lockdown.md`) that goes
fullscreen, blocks copy/paste, and records when a student leaves the page — but
that is a *record*, not a *lock*. If you want students genuinely unable to open
another tab, one of the two options below is required.

---

## Option 1 — GoGuardian Scene (recommended; no IT ticket, no code)

Palm Beach County licenses GoGuardian, and GoGuardian Teacher can do exactly
this from the teacher's own console, per class period.

1. In GoGuardian Teacher, create a **Scene**.
2. Set it to **Allow list** mode.
3. Add **only** the domains in [Required allowlist](#required-allowlist) below.
4. Set **Tab limit for students** to **1**.
5. Apply the Scene at the start of the assessment; end it when the class
   finishes.

Why this is the recommendation: it is teacher-controlled, reversible in seconds,
requires no device reconfiguration, and leaves the Chromebooks completely normal
outside the testing window.

Caveat from GoGuardian's own documentation: the Lock Screen command only
disables Chrome windows — apps running outside Chrome may be unaffected.

---

## Option 2 — ChromeOS single-app Web Kiosk (stronger; needs district IT)

A true device-level lockdown. The Chromebook boots straight into the app: no
shelf, no browser UI, no sign-in screen, no way out.

In the Google Admin console: **Devices → Chrome → Apps & extensions → Kiosks →
+ → Add by URL**, pointing at the app's URL, then apply to the org unit holding
the testing devices.

Trade-off: this is a *device* setting, not a class setting. A Chromebook in
kiosk mode is a testing appliance until IT changes the config back, so this
suits a dedicated testing cart far better than 1:1 daily-use devices.

---

## Not an option: Google Forms "locked mode"

Locked mode is a **Google Forms feature only**. A third-party web application
cannot invoke it, and it additionally requires all students to be on managed
Chromebooks in the same Workspace domain. It is listed here only so nobody
spends time looking for it.

---

## Required allowlist

**This is the part that most often gets missed.** Allowlisting only the app's
own domain will break lesson videos, because the lesson media layer embeds
YouTube (`src/lib/lesson-editor/youtube.ts`,
`src/components/student/mission/media/VideoStepView.tsx`).

| Host | Why |
|---|---|
| the app's own domain (e.g. `mycivicsclass.com`, plus `www.`) | The platform itself |
| `www.youtube-nocookie.com` | Lesson video embeds (privacy-enhanced player) |
| `www.youtube.com` | YouTube player assets / fallback |
| `i.ytimg.com` | Video thumbnails |

Visual stimuli (`public/stimuli/`) are served same-origin and need no extra
host. The app makes **no third-party analytics or telemetry requests at all**
(non-negotiable rule #9), so nothing else needs allowlisting.

**Recommended scoping:** apply the restrictive Scene **only during
assessments**, not during lessons. Lessons are meant to be rich — video,
images, read-aloud — and there is nothing to cheat on in a lesson. Locking the
whole class period costs instruction and buys nothing.

---

## Accessibility — read before writing the config

A lockdown written carelessly can strand the students who most need support.

- **ChromeOS built-in accessibility tools** (ChromeVox, Select-to-Speak, screen
  magnifier, high-contrast) remain available inside kiosk and locked contexts.
  Do not disable them at the policy level.
- **The app's own read-aloud** uses the in-page Web Speech API, and glossary
  popovers, sentence chunking, and reading-level switching are all in-page.
  None of them make outbound requests, so all of them survive any allowlist.
- **Focus Mode does not disable text selection.** Blocking selection would break
  Select-to-Speak and screen-reader text navigation; copying is blocked at the
  `copy` event instead.
- **Students with the frequent-breaks accommodation (`ACC-BREAKS`)** are
  explicitly encouraged by the app to step away. Focus Mode provides a **Take a
  break** button, and breaks taken that way are never recorded. Make sure
  proctoring staff know it exists so a student is not penalized for using an
  accommodation the app itself offered.

---

## What none of this stops

Be honest with yourself about the threat model before investing in it:

- a phone in a lap
- a second device
- a printed or handwritten cheat sheet
- a classmate

Device lockdown addresses one attack surface. The platform's stronger,
always-on defenses are elsewhere and require no configuration: answer options
are shuffled per student (`src/lib/shuffle.ts`), Mastery Challenges rotate
between disjoint forms, answer keys never leave the server, and the
confidence-calibration loop makes looked-up answers visible after the fact — a
student who cheats reports high confidence and then shows collapsing retention
on the Daily Republic Drill, which surfaces in the decay and calibration
dashboards whether or not the device was locked.

---

## In-app Focus Mode (what this repo controls)

Independent of the above, and safe to run alongside it:

1. Set `FEATURE_SECURE_ASSESSMENT="true"` in the environment.
2. Per class: **Teacher → Classes → Settings → Focus Mode → Turn on Focus Mode
   for this class.**

Then, on Mastery Challenges, Readiness Checks, Republic Challenge, and the
Final Trial, students get a Begin gate and fullscreen, copy/paste and
right-click are blocked, and leaving the page is recorded. Teachers see a
**Focus** flag on the attempt row in the student profile, with the existing
**Void** control alongside it. Nothing is ever deducted automatically.
