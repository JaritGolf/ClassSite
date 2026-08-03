# My Civics Class

## Application Review Packet — Palm Beach County School District

| | |
|---|---|
| **Application** | My Civics Class |
| **Purpose** | Florida 7th Grade Civics mastery-learning platform with EOC-readiness focus |
| **Developer** | Arthur Danison III, Civics teacher — *[School]* |
| **Contact** | arthur.danisoniii@palmbeachschools.org |
| **Status** | Internally developed by a district employee. Not a commercial vendor product. No cost to the district. |
| **Live evaluation site** | https://mycivicsclass.com — see §1.3 before visiting |
| **Request** | Approval for supervised pilot use in the developer's own classroom |
| **Document version** | 1.0 — August 3, 2026 |
| **Standards addressed** | SS.7.CG.1.1 – SS.7.CG.3.14 (Florida Civics, 2021 revision) |

---

## How to use this document

This packet is written to be read by three different reviewers. Each can go directly to their
own section:

| If you are reviewing for… | Read |
|---|---|
| **Instructional materials / digital resources** | §2 Instructional design, §7 Accessibility, §9 Limitations |
| **Student data privacy** | §3 Data inventory, §4 Access control, §8 Hosting, §9 Limitations, §10 Requested confirmations |
| **IT / information security** | §4 Access control, §5 Assessment integrity, §6 Application security, §8 Hosting, §9 Limitations |

Everything asserted here is traceable to source code or to a supporting document in the
project repository, which can be provided in full on request. Where a control is
**documented but not yet independently verified**, this packet says so explicitly rather
than implying otherwise. §9 is a complete, deliberate disclosure of current gaps.

---

## 1. Executive summary

### 1.1 What this is

My Civics Class is a web application that teaches and assesses the Florida 7th Grade Civics
course one benchmark at a time. Students experience it as a game called *Build the Republic* —
they build up the Republic by demonstrating mastery of each state standard. Teachers
experience it as a learning management system with item-level analytics and intervention
tools.

The instructional model is **mastery learning**: a student must score 80% on a benchmark
assessment before the next benchmark unlocks. A student who does not reach mastery is
routed to targeted remediation built from the specific misconception their wrong answer
revealed, then reassessed on a different form of the test. Long-term retention is handled by
a spaced-retrieval scheduler (SM-2) that resurfaces material at expanding intervals.

Critically, the model has **no failure state**. A student who does not reach mastery after
three attempts, completed remediation, and a seven-day interval is "off-ramped": the next
benchmark unlocks anyway and the material simply returns more often in review. The teacher
is notified. Students are never blocked from progressing and never see a public ranking
against classmates.

### 1.2 The six controls most relevant to a district review

| Control | Summary | Where verified |
|---|---|---|
| **1. No third-party analytics or telemetry** | The application has six runtime dependencies and no analytics SDK, error tracker, or tag manager. An automated test scans the source for known vendor signatures on every run. As of this packet, the browser itself now blocks outbound connections to any external host. | §6.1 |
| **2. All grading is server-side** | Answer keys are never sent to a student's browser before submission. The client cannot report its own score; fields such as `isCorrect` are stripped from any incoming request before grading occurs. | §5.1 |
| **3. Least-privilege access, enforced in depth** | Every protected page is gated three times — at the edge, at the server component, and again at the API route. Teachers can only reach students on their own roster; this is enforced inside the data layer, not merely in the UI. | §4 |
| **4. Data minimization by design** | The application does not collect health or behavior notes, IP addresses, user agents, keystrokes, screenshots, or browsing history. Time-on-task is recorded as one of thirteen coarse activity categories — never as a URL. | §3 |
| **5. Comprehensive audit logging** | 36 distinct sensitive actions are audit-logged with actor, entity, and timestamp. Most log entries are written inside the same database transaction as the change itself, so a change cannot exist without its log entry. | §4.5 |
| **6. Accessibility as a requirement, not a finish** | WCAG 2.1 AA is the stated target. Fifteen accommodations are teacher-granted profile attributes that follow the student across every screen. A three-level reading-load ladder and first-language glossaries are built in. Known gaps are disclosed in §9. | §7 |

### 1.3 Please read before visiting the live site

The site at **https://mycivicsclass.com currently allows any visitor to sign in as a
student, teacher, parent, or administrator with one click**, with no credentials.

This is deliberate and is disclosed here so that a reviewer does not encounter it and
reasonably conclude the application is insecure. The reasons:

- The database behind that site contains **synthetic demonstration data only**. There is no
  real student information of any kind in it, and there never has been. The six students
  visible in the demo classroom are fictional.
- It exists so that a reviewer can evaluate all four role perspectives without the developer
  having to provision accounts for a review committee.
- It is controlled by a **single environment variable** (`DEMO_OPEN_LOGIN`). Removing that
  variable and redeploying — a two-minute operation, no code change — restores the
  production configuration in which the only sign-in methods are district Clever SSO and
  Google, and the one-click demo login does not exist. Two independent code paths enforce
  that: the demo provider is omitted from the authentication configuration entirely, and a
  runtime check refuses the credential even if the provider were somehow present.

**This variable will be removed before the application is used with a single real student
record.** It is item 1 on the go-live checklist in §8.4, and the developer will confirm its
removal in writing to the district at that time. If the review committee would prefer the
demo closed immediately, it can be closed the same day the request is made.

### 1.4 What is being requested

Approval for **supervised pilot use in the developer's own Civics classroom**, not
district-wide deployment. This scope matches what is actually built: the first unit of the
course is complete and classroom-ready; later units are authored progressively (see §2.4 and
§9.2 for exact current coverage). A pilot lets the instructional model be evaluated against
real classroom use while the content library grows.

### 1.5 What the district needs to decide

Nine items require a district answer that the developer cannot supply. They are listed as
explicit questions in **§10**, each paired with the document that will be completed once the
district answers. The most consequential are: whether Clever integration is permitted and at
what data scopes; what hosting arrangement is acceptable for student progress data; whether
a data privacy agreement or vendor review is required for an internally developed
application; and what identity verification is required before any parent or guardian
account is enabled.

---

## 2. Instructional design and standards alignment

### 2.1 Course structure

| Level | Count | Notes |
|---|---|---|
| Reporting categories | 4 | The Florida EOC blueprint groupings — Origins & Purposes of Law and Government; Roles, Rights & Responsibilities of Citizens; Government Policies & Political Processes; Organization & Function of Government |
| Benchmarks | 36 | Every SS.7.CG standard, in numeric sequence |
| Units | 7 | Curriculum sequence grouping |
| Misconception inventory | 50 | Catalogued student misconceptions that wrong answers are mapped to |
| Academic vocabulary terms | 103 | Tier-2 academic and tier-3 civics-specific, glossed in-app |

### 2.2 Standards alignment is machine-verified

The application's benchmark definitions are pinned to a verbatim snapshot of the official
Florida standard statements, retrieved from the CASE standards network. An automated test
enforces five guarantees on every test run:

1. The set of benchmark codes in the application **exactly equals** the official set of 36 —
   no extras, none missing.
2. Each benchmark's stored official statement is **byte-identical** to the official source.
3. Each benchmark's own instructional prose contains that standard's topical anchors, so
   content cannot drift off-standard while keeping the right code.
4. Sequence order follows numeric code order, 1 through 36, with no gaps.
5. The strand-to-reporting-category mapping and the seven-unit partition hold.

This test exists because of a real failure that it now prevents. In July 2026 a
cross-check against the official standards revealed that the application's strand-1
benchmarks were carrying **pre-2021 SS.7.C content relabeled with post-2021 SS.7.CG codes** —
only one of eleven strand-1 codes matched its official meaning. Because every assessment item
inherits its benchmark's code, roughly 250 items were keyed to standards whose official
meaning differed. The content was remapped to the correct standards and the alignment test
was written so that this class of drift is now a build failure rather than a discovery.
The full remediation record is in the project's architecture decision record 0017.

Teachers can see the verbatim official standard statement, a plain-language summary, and the
official clarifications for any benchmark from that benchmark's page in the application.

### 2.3 Every assessment item is tagged

Items are not usable by the application unless they carry a full tagging record: benchmark,
reporting category, cognitive complexity, stimulus type, reading-load level, skill tag,
misconception identifier, remediation tag, source tier, and approval status. Tagging is what
makes the diagnostic remediation work — an incorrect answer maps to a specific misconception,
which maps to specific reteaching content.

An automated validator enforces this, and an integration test runs it across the live item
bank. §9.8 discloses precisely which of the ten tags the validator currently enforces and
which it does not.

Item distribution per benchmark follows the EOC blueprint: a fixed mix of vocabulary, basic
recall, scenario, source-analysis, chart, misconception-probe, and mixed items; a
reading-load spread of 9 / 15 / 6 across the three levels; and a cognitive-complexity spread
of 6 low / 17 moderate / 7 high.

### 2.4 Content approval workflow

No content reaches a student without an approval status of APPROVED. The application filters
on approval status in every serving path — a draft item is invisible to students by
construction, not by convention.

Content is classified by trust tier: Tier A (state-published, auto-approved), Tier B
(reviewed published bank), Tier C (AI-assisted draft, always requires review), and Tier D
(bulk-approved by tag under teacher authority). The teacher has an approval queue in the
application for reviewing, approving, revising, or archiving items in bulk.

**Current library state, as measured against the live database on August 3, 2026:**

| | |
|---|---|
| Assessment items, approved and serving | 240 |
| Assessment items, drafted but not approved | 30 |
| Benchmarks with a complete 30-item approved bank | 7 |
| Benchmarks with any approved items | 8 (SS.7.CG.1.1 – 1.7, and 1.10) |
| Benchmarks with no authored items yet | 28 |
| Guided lessons, approved | 8 |
| Assembled assessments | 48 |

That distribution is the reason the request in §1.4 is for a single-classroom pilot rather
than district adoption. §9.2 states the coverage gap plainly.

### 2.5 AI assistance in content drafting — disclosed

Some assessment items and lesson content were drafted with AI assistance and then reviewed
by the developer, who is the certified teacher of record for the course. This is disclosed
because district policy on AI-assisted instructional material may bear on it — see the
question in §10.

Two honest qualifications. First, AI-drafted content is classified Tier C, which by design
requires human review before approval. Second, for the completed first unit the developer
exercised a documented directive to approve that content at seed time on their own
authority, meaning **review was post-hoc rather than pre-publication, and the developer is
the sole content reviewer**. The reasoning is recorded in architecture decision record 0013.
A district that wants a second reviewer in that loop before pilot use should say so; the
approval queue already supports it.

---

## 3. Student data: what is collected and what is not

### 3.1 What is stored

| Category | Stored | Detail and rationale |
|---|---|---|
| Clever or Google account identifier | Yes | The account link. No password is ever stored — authentication is delegated entirely to the identity provider. |
| Student first and last name | Yes | The minimum needed for a teacher to recognize their own roster. |
| District student identifier | Optional | Only if provided by the roster source. |
| Grade level | Yes | Defaults to 7. |
| Class, period, teacher, school year | Yes | Required to scope every dashboard and report. |
| Assessment attempts and scores | Yes | The basis of mastery and progression. |
| Individual item responses | Yes | Required for diagnostic remediation — which misconception to reteach. |
| Confidence ratings | Yes | Three levels ("Not sure" / "Pretty sure" / "Very sure"). Used to detect overconfidence, a documented EOC risk factor. |
| Spaced-retrieval scheduling state | Yes | One record per student-benchmark pair. |
| Derived EOC readiness estimates | Yes | Computed from benchmark and category performance. |
| Accommodation grants | Yes | Which supports are active, who granted them, and when. |
| **English language learner status** | Yes | `ell_status`. Drives reading-load defaults and first-language glossaries. |
| **Exceptional Student Education status** | Yes | `ese_status`, stored as a boolean flag. Drives accommodation defaults. |
| **Reading-level flag** | Yes | A boolean used to default a student to scaffolded reading load. |
| **First language preference** | Yes | `l1_language`, used to select Spanish or Haitian Creole glossaries. |
| Time-on-platform sessions | Yes | Start time, active seconds, and a coarse activity category. See §3.3. |
| Assessment focus events | Only if enabled | Off by default; requires two separate opt-ins. See §5.3. |
| Student-submitted feedback text | Yes | Free text from the in-app suggestion box, routed only to that student's own teacher. |
| Actual state EOC scores | **Only with district consent** | The import path refuses any record not explicitly marked as consented, and is restricted to administrators. |
| Parent or guardian account data | Only if enabled | Email and relationship label only. Feature is disabled by default. |

The four rows in bold are protected-class or disability-adjacent attributes and are called
out deliberately. They are stored because they are what make the accessibility features
function — a student flagged as an English language learner automatically receives
first-language glossaries and scaffolded reading load without a teacher having to remember to
set it per assignment. They are visible to that student's own teacher and to administrators,
and are **excluded from every parent-facing view and every data export**. If district policy
requires these to be handled differently, or requires them to come from the district's own
systems rather than being set in this application, the developer will change the handling.

### 3.2 What is deliberately not collected

| Not collected | Note |
|---|---|
| Passwords | Authentication is delegated to Clever or Google. No credential is ever stored or seen by this application. |
| Health, behavior, or discipline notes | Not modeled anywhere in the database. |
| IP addresses | Login audit records are written with empty metadata by design — no address, no user agent, no device fingerprint. |
| Keystrokes, screenshots, screen recording, webcam or microphone access | Not modeled, not requested. As of this packet the browser is instructed at the HTTP header level to deny camera, microphone, geolocation, and USB access to this application entirely. |
| Browsing history or visited URLs | The time-on-task feature records a coarse category, never a path. See §3.3. |
| Location data | Not collected. |
| Student personal information in URLs | A standing prohibition. Reports are delivered in the response body, never as query-string parameters, and the referrer policy withholds even the path from any external site. |
| External gradebook data | No integration. |
| Advertising or marketing identifiers | None. There is no advertising in the application. |

### 3.3 Time-on-task monitoring, and its deliberate limits

Teachers can see when a student worked, for how long, and what they accomplished in that
session. This is monitoring of minors and was built with specific limits:

- **Activity is recorded as one of thirteen fixed categories** — dashboard, map, mission,
  assessment, practice, drill, republic-challenge, source-decoder, strategy, badges,
  remediation, settings, other. The student's browser sends only the category. Raw paths are
  never transmitted and never stored, so no record of which specific benchmark or page a
  student visited enters the monitoring data. An unrecognized value falls back to "other".
- **Active time is bounded, so it cannot be inflated.** Each heartbeat can credit at most 90
  seconds, and the heartbeat stops entirely on a hidden tab or after five minutes without
  input. A forgotten open tab therefore cannot be reported as an hour of work. Wall-clock
  span is shown separately so a teacher can see both.
- **The student identity comes only from the session cookie.** A student identifier in the
  request body is never read, so one student cannot log activity as another.
- **Nothing about it is visible to the student** — no timer, no countdown, no idle warning.
- **It is excluded from the parent portal.** Whether behavioral monitoring is appropriate to
  share with families is a policy question for the district, not a default the developer set.
- **It has its own configurable retention window**, separate from academic records, because a
  session record is not part of a student's academic record and deleting it destroys no
  student work.

### 3.4 Parent and guardian access

The parent portal is **disabled by default** and will stay disabled until the district
confirms its identity-verification requirements (§10, item 4).

When enabled, the design is administrator-mediated rather than self-service: an administrator
creates the parent account against a known email address, links it to a student, and must
explicitly mark that link VERIFIED. A link that is pending or rejected surfaces **nothing** —
the verified status is a filter in the database query, not a check in the interface. A parent
cannot self-register and cannot reach a student they are not verifiably linked to.

What a verified parent sees is an **allowlist**, not a filtered version of the teacher view.
The parent summary is composed from scratch out of seven permitted sections. This matters:
because it is built up rather than pared down, teacher-only data cannot leak into it by
accident when a new field is added elsewhere. A parent sees current mission and status,
mastery counts, remediation status, recent assessment results as score and pass/fail and date
only, a readiness estimate, suggested review topics, and positive indicators.

A parent never sees: answer keys, the item bank, individual questions, item-level distractor
analysis, any other student, confidence-calibration data, decay metrics, teacher overrides,
accommodation grants, private teacher notes, or focus/monitoring events. **Three separate
automated tests enforce this**, including one that seeds real calibration, override,
accommodation, and decay data for a student and then asserts that none of it appears anywhere
in the serialized parent view.

### 3.5 Data retention

Retention is configurable, and every window defaults to **retain nothing automatically** —
no data is ever deleted unless an administrator sets a positive threshold and explicitly runs
a purge. Three windows exist: audit logs, voided assessment attempts, and activity sessions.

Two properties worth noting for a reviewer. The purge **runs as a preview by default** and
reports what it would delete without deleting it. And it can only ever delete aged audit logs,
aged **voided** attempts, and aged activity sessions — active mastery data, item responses,
and scheduling state are outside its reach entirely, so a misconfigured window cannot destroy
a student's academic record.

The district sets these windows (§10, item 6). Two current gaps are disclosed in §9.9.

---

## 4. Authentication, authorization, and audit

### 4.1 Authentication

| Method | Who | Notes |
|---|---|---|
| **Clever SSO** | Students, teachers, administrators | The intended primary path. District-managed identity. |
| **Google OAuth** | Staff only | Fallback. A new Google sign-in is created INACTIVE and cannot proceed until an administrator activates it — so an arbitrary Google account cannot self-provision access. |
| Demo role login | Nobody, in production | Present only when explicitly enabled for evaluation. See §1.3. |

**Clever scopes requested are minimal and read-only:** `read:user_id`, `read:students`,
`read:teachers`. No Google Classroom, Drive, or Directory scope is requested. Google
requests only `openid`, `email`, and `profile`. The full scope rationale is in the project's
OAuth scope document, which the district can review against its own policy (§10, item 3).

No password is ever stored, transmitted to, or seen by this application.

Sessions are stateless signed tokens. As of this packet a session expires **eight hours**
after issue — long enough that a student is never asked to re-authenticate mid-class period,
short enough that a shared Chromebook left signed in at dismissal is stale the next morning.
The honest limitation of a stateless session is stated in §9.11.

### 4.2 Roles and route policy

Four roles: STUDENT, TEACHER, PARENT, ADMIN. Each has exactly one area of the application,
enforced by an explicit policy table rather than by ad-hoc checks.

### 4.3 Authorization is enforced in depth

Every protected page passes three independent gates:

1. **Edge middleware** validates the session token and the role against the route policy
   before the request reaches application code.
2. **The server component** re-checks the role when rendering the page.
3. **Each API route** re-checks the role independently, so an API cannot be called directly
   even if a page gate were bypassed.

This is intentional redundancy: no single mistake in one layer exposes data.

### 4.4 Roster scoping — a teacher can only reach their own students

Every teacher-facing operation that touches a specific student first asserts that the student
is enrolled in one of that teacher's own classes. Class-scoped operations assert the class is
owned by the calling teacher.

**These checks live inside the data layer, not in the API routes.** That is a deliberate
architectural choice and the reason it is trustworthy: fourteen internal modules call one of
the two assertions themselves — eight assert student-roster membership and six assert class
ownership — so a future route, script, or report that calls one of those functions inherits
the check automatically and cannot forget to write it.

This is disclosed as a control that was **added in response to a real defect found by
internal review**. In July 2026 a self-directed adversarial review of the teacher workflow
found that the teacher-override and accommodation functions verified that the caller was *a*
teacher but never that the target student was on *that* teacher's roster — meaning any
authenticated teacher could have altered mastery status or accommodations for any student in
the district by supplying an arbitrary student identifier. It was confirmed exploitable
against a test student, fixed at the data layer, and a dedicated regression test now exists
whose stated purpose is to keep it fixed. It is reported here because a review committee
should know that this codebase gets adversarially reviewed and that findings are fixed and
documented rather than quietly patched.

### 4.5 Audit logging

36 distinct actions are audit-logged, across content approval, mastery override, accommodation
changes, assessment voiding, report and audit-log export, parent account provisioning and
linking, parent summary sharing, EOC score import, calibration approval, retention purges,
substitute-mode toggling, lesson editing, and logins.

Each record carries the acting user, the action, the entity type and identifier, structured
metadata, and a server-generated timestamp. **Most records are written inside the same
database transaction as the change they describe**, so the change and its log entry either
both exist or neither does.

Two details a reviewer may appreciate: the audit-log export **audits itself**, so there is a
record of who extracted the log; and the retention purge writes its own record *after*
deleting aged logs, so a purge can never delete the evidence of itself.

Administrators can view and filter the log in the application and export it as CSV.

### 4.6 Substitute mode

A teacher leaving a substitute can enable a read-only mode. It blocks all write operations
across teacher, mastery, reading-load, administrative, and review endpoints, at two
independent layers — the edge and each route handler. The mode is carried in a cookie that is
HTTP-only, secure in production, same-site strict, and expires in 24 hours. Toggling it is
audit-logged.

---

## 5. Assessment integrity and academic honesty

### 5.1 Grading happens only on the server

The client is never trusted with grading. Specifically:

- **The answer key is never sent to the browser before submission.** The database query that
  fetches questions for a student uses an explicit field list that omits the
  correctness flag and the answer feedback. This is enforced by the shape of the query, not
  by filtering afterward — if a new field were added to the schema, it would not be
  accidentally included.
- **Tamper fields are stripped before grading.** The submission schema accepts only an
  attempt identifier, a question identifier, a selected option identifier, an optional
  confidence rating, and an optional elapsed time. Anything else a modified client sends —
  including a claimed score or a claimed correctness flag — is discarded before the grading
  function ever runs. The grading function is a pure function that receives the answer key
  from the database and nothing from the request.
- **Answer order is shuffled per student.** Authored item banks list the correct option
  first. Options are shuffled at serve time using a seed derived from the student and the
  question, so the order is stable across page refreshes but differs between students.
  Grading matches by option identifier, so shuffling is grading-safe. This was added after
  internal review found that the correct answer was in position A for all 246 items then in
  the bank.
- **Partial submission cannot inflate a score.** Unanswered questions count as zero against
  the full question count, so submitting only the answers a student is confident about
  always lowers the score rather than raising it.
- **Attempts are ownership-checked and single-submission.** An attempt can only be submitted
  by the student it belongs to, and a second submission is refused.
- **Sequence cannot be skipped by URL.** A mastery assessment refuses to start unless the
  student has passed the corresponding readiness check, because the mastery assessment's
  identifier appears in page data and a student could otherwise deep-link past all the
  instruction.

### 5.2 Answer keys and item security

Answer keys, per-item feedback, and distractor analysis are never returned for secure
assessment types — mastery challenges, reassessments, cumulative review, the final trial,
readiness checks, and diagnostics. Per-item feedback is returned only for explicitly
labeled practice activity, and only after the answer is submitted.

When a student fails a readiness check, the application returns **topic labels only** for the
skills they missed — enough to direct their review, with no indication of which specific
question was wrong and no answer key, so the result cannot be used to reverse-engineer the
assessment across retries.

### 5.3 Focus Mode — and an honest answer about device lockdown

The developer asked whether students could be locked out of all other computer functions
during an assessment on district Chromebooks. **The honest answer is that no web application
can do this, and this packet will not imply otherwise.** A web page has no interface that can
lock a Chromebook. Google Forms' "locked mode" is available to Google Forms only and is not
exposed to third-party applications.

**The lock belongs to device management, and the district already has the tool for it.**
Palm Beach County licenses GoGuardian, whose Teacher "Scene" feature — an allow list combined
with a one-tab limit — does exactly what was wanted, per class period, with no software
changes. The project includes a hand-to-IT runbook, `docs/chromebook-lockdown.md`, giving the
configuration, and flagging one trap found while writing it: **allowing only the application's
own domain will break lesson video**, because lesson videos are embedded from YouTube's
privacy-enhanced player. The required hosts are listed, with a recommendation to scope the
restriction to assessment periods rather than the whole class.

What the application itself provides is the honest counterpart — enforce what a browser can,
record what it cannot, and never punish automatically:

- Focus Mode puts a secure assessment behind a "Begin" gate, requests fullscreen, and blocks
  copy, cut, paste, right-click, and print.
- If the student leaves the page, the application records **that** focus was lost and roughly
  for how long. It records **no URL, no tab title, no screenshot, and no keystrokes** — there
  is no information about where the student went, because that information is never captured.
  The stored record has four fields: which attempt, which event type, how long, and a
  server-generated timestamp.
- **It never auto-punishes.** Nothing recorded here affects grading, mastery, scheduling, or
  analytics. The teacher sees a "Minor" or "Review" indicator next to the attempt and decides
  what it means. Automatic voiding was considered and rejected.
- The student is told, at the moment it happens, in an accessible announcement. It is not
  covert.
- **It is off by default and requires two separate opt-ins** — an application-level flag and
  a per-class teacher setting. With the flag unset the assessment player is byte-identical to
  its normal behavior.
- **It is exempt for students with a breaks accommodation.** That accommodation actively
  tells a student to step away, so Focus Mode provides a "Take a break" control that hides
  the questions and records nothing at all. This was verified: a departure of over a second,
  plus attempted copy and paste, during a break produced zero records.
- **Text selection is deliberately left enabled.** Disabling it would break Select-to-Speak,
  screen-reader navigation, and glossary popovers — a real accessibility regression for a
  marginal deterrent. Copying is blocked at the copy event instead.
- Records are excluded from the parent portal, and are deleted along with a voided attempt.

The runbook is also candid about what none of this stops: a phone, a second device, a paper
cheat sheet, or a classmate. Focus Mode is a deterrent and a record, not a proctor.

---

## 6. Application security

### 6.1 No third-party analytics or telemetry — now enforced by the browser

This is a standing prohibition in the project's own rules, and it is enforced three ways.

**By dependency discipline.** The application has six runtime dependencies: the database
client, the web framework, the authentication library, the two React packages, and a schema
validation library. There is no analytics SDK, no error-reporting service, no session-replay
tool, no feature-flag service, and no third-party script loader. Nothing in the dependency
tree is capable of beaconing out.

**By automated test.** A test scans the application source on every run for the signatures of
known analytics and telemetry vendors — Google Analytics, Tag Manager, Segment, Mixpanel,
Hotjar, FullStory, Amplitude, PostHog, Datadog RUM, and Sentry — and fails if any appears. It
additionally treats plain YouTube as a violation, because a standard YouTube embed or
thumbnail contacts Google on page load. Exactly two exceptions are allowlisted in the test
itself, each pinned to a single named file: the click-to-load video facade, and a server-side
video-title lookup that runs only when an adult edits a lesson and carries no student data.

**By Content-Security-Policy, added as part of this review.** The application now sends a
policy that forbids the browser from contacting any external host. This was verified live on
August 3, 2026 by attempting each case in a real browser session:

| Attempt | Result |
|---|---|
| Load the sanctioned lesson video from YouTube's privacy-enhanced player | **Allowed** — lesson video works |
| Load a frame from any other host | **Blocked** by `frame-src` |
| Load an external analytics script from a CDN | **Blocked** by `script-src` |
| Send an outbound request to an external host | **Blocked** by `connect-src` |

The last row is the substantive one. Until now, "no student data leaves this application" was
a policy enforced by discipline and a source-code test. It is now additionally enforced by the
student's own browser: even if code were added that tried to transmit data to an outside
service, the browser would refuse to send it.

**Lesson video is click-to-load.** No network request of any kind — not even a thumbnail —
reaches Google until a student deliberately presses play, and the embed uses YouTube's
privacy-enhanced host. The facade tells the student this in plain language. Verified live: no
external host appears in the network log for any student page.

**Fonts are self-hosted.** Typefaces are downloaded at build time and served from the
application's own origin, so no font request reaches an outside provider. The body typeface is
Atkinson Hyperlegible, developed by the Braille Institute for maximum character
disambiguation for young and striving readers.

### 6.2 HTTP security headers

Added as part of this review and verified in place:

| Header | Value | Purpose |
|---|---|---|
| `Content-Security-Policy` | See §6.1 | Restricts every resource the page may load or contact |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | Browser will not attempt plaintext HTTP |
| `X-Frame-Options` | `DENY` | Clickjacking protection |
| `X-Content-Type-Options` | `nosniff` | No MIME-type sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Withholds the path from external sites, reinforcing the no-information-in-URLs rule |
| `Permissions-Policy` | camera, microphone, geolocation, USB, payment, and motion sensors all denied | The application cannot request these, so the browser will not even prompt |

The Permissions-Policy row is worth a reviewer's attention on a platform serving 12- and
13-year-olds: it is a one-command-verifiable statement that this application has no ability
to access a camera or microphone.

One weakness in the policy is disclosed in §9.10.

### 6.3 Other application-layer protections

- **Data exports are column-allowlisted.** Report builders name their columns explicitly, and
  a test asserts that no export contains answer keys, correctness flags, per-item data, or
  distractor analysis.
- **CSV formula injection is neutralized.** A field beginning with `=`, `+`, `-`, or `@` is
  quoted so it cannot execute as a formula when the file is opened in a spreadsheet.
- **File uploads are validated by content, not by claim.** Lesson image uploads identify the
  format by inspecting the actual file bytes rather than trusting the browser-supplied
  content type, which is trivially spoofable. Only PNG, JPEG, and WebP are accepted.
- **Student-submitted text is never interpreted.** Suggestion-box text is stored exactly as
  typed and rendered as text, never as markup. It carries no user agent and no IP address —
  the code comment gives the reason: these are minors. It routes only to that student's own
  teacher.
- **Actual EOC score import is consent-gated** and administrator-only. Records not explicitly
  marked as consented are rejected.
- **Calibration weights are never auto-applied.** The system can recommend adjustments to how
  readiness is calculated from real outcome data, but an administrator must approve them; the
  baseline blueprint is never mutated.

---

## 7. Accessibility, differentiation, and equity

### 7.1 Target and approach

The stated target is **WCAG 2.1 AA**. Accessibility is treated as a functional requirement:
read-aloud, sentence chunking, and vocabulary support are in the core product, not an
add-on mode.

Accommodations are **profile attributes, not per-assignment settings**. A teacher grants a
support once and it follows the student through every screen and every assessment. Grants are
audit-logged with who granted what and when. Students see their accommodations framed
positively, as "tools turned on for you."

### 7.2 Accommodation catalog — 15 codes

| Code | Support |
|---|---|
| ACC-EXT-TIME | Extended time on timed activities |
| ACC-READ-ALOUD | Read-aloud on passages and lessons |
| ACC-CHUNK | Sentence chunking of long passages |
| ACC-SIMPLE-LANG | Defaults passages to the scaffolded reading level |
| ACC-T2-VOCAB | Academic vocabulary popovers always on |
| ACC-REDUCED-CHOICES | Three answer choices instead of four, on practice only |
| ACC-BREAKS | Suggested pause every ten minutes |
| ACC-SCREEN-READER | Screen-reader optimization |
| ACC-HIGH-CONTRAST | High-contrast palette |
| ACC-LARGE-TEXT | Larger base text with reflow |
| ACC-CONTEXT-BOOST | Background context cards before unfamiliar references |
| ACC-L1-SPANISH | Spanish glosses on civics terms |
| ACC-L1-CREOLE | Haitian Creole glosses on civics terms |
| ELL | English language learner reading defaults |
| BELOW-GRADE-READER | Below-grade-reader reading defaults |

**§9.6 discloses which of these are fully implemented and which are not.** Two are not, and
one of those is extended time. This is stated plainly because a district cannot evaluate an
accommodation catalog it has been given an inaccurate picture of.

### 7.3 Reading-load ladder

Every source passage can exist at three levels: level 1 (paraphrase with glossary), level 2
(chunked excerpt, equivalent to what the EOC actually presents), and level 3 (raw
unmodified source). A student's effective level comes from their accommodations, and they can
opt up or down themselves.

One rule is enforced in code rather than by policy: **a mastery challenge is never
downgraded below level 2.** Scaffolding supports learning; it cannot be used to lower the bar
at which mastery is certified. Level 3 passages deliberately carry no glossary annotations,
because reading unaided source material is itself the skill being practiced there.

A parallel "Source Decoder" progression teaches stimulus-reading skills directly —
highlighting, paraphrasing, identifying author purpose, and comparing sources.

### 7.4 Language support

Given the district's Spanish- and Haitian Creole-speaking populations, tier-3 civics
vocabulary can display a first-language gloss. Current state:

| Language | Translations | Status |
|---|---|---|
| Spanish | 71 | Approved and serving |
| Haitian Creole | 8 | 1 approved; 7 pending review |

Glosses are gated to approved translations by the database query, so an unreviewed
translation cannot appear to a student. §9.7 discloses the review status honestly — the
Spanish translations have not been reviewed by a Spanish-proficient reviewer, and the Haitian
Creole set is a proof-of-concept sample rather than usable coverage.

### 7.5 What has been verified, and how

- **Automated accessibility scanning.** An axe-core scan asserting **zero** WCAG 2.0/2.1 A and
  AA violations runs against seven pages: the student dashboard, a mission page, student
  settings, the teacher reports page, the parent-summary print view, the administrator audit
  log, and the administrator retention page. It has caught and forced the fix of real
  contrast failures during development.
- **Reduced motion and focus visibility.** Motion respects both the operating-system
  preference and an in-app toggle. A visible focus indicator is applied application-wide.
- **High contrast and large text** are available both as student self-service toggles and as
  teacher grants, and are applied at a single point in the page shell so every student screen
  inherits them.

**§9.3, §9.4, and §9.5 disclose the limits of this verification**, which are material: all
manual accessibility testing is still outstanding, there is a known AA deviation, and the
automated scan does not cover the assessment player or the parent pages.

---

## 8. Hosting, infrastructure, and operations

### 8.1 Current configuration

The application is a Next.js application backed by PostgreSQL. The current evaluation
deployment is:

| Layer | Provider | Region |
|---|---|---|
| Domain and DNS | Cloudflare Registrar | — |
| Application hosting | Vercel | United States |
| Database | Neon PostgreSQL | us-east-1 |

Transport is TLS on a valid certificate, with plaintext HTTP redirected to HTTPS. Encryption
at rest is a property of the managed database provider.

**This is a proposal, not an approved configuration.** The project's hosting document
compares three options — the current managed arrangement, district-owned tenancy, and
on-premises — and recommends district-owned tenancy for real student data specifically
because it keeps the data inside district control. The district decides (§10, item 5).

### 8.2 Credentials

Credentials are held in the hosting platform's environment configuration and never committed
to source control. The project maintains a credential inventory listing each secret, its
system of record, and its rotation procedure — recording names and rotation steps only, never
values. All credentials in the evaluation environment are scheduled for rotation before any
real data is present.

### 8.3 Operations

Deployment, database migration, seeding, retention purge, and administrator bootstrap are all
scripted and documented in a runbook. Migrations are versioned and applied forward.

### 8.4 Go-live checklist — before any real student record

This is the developer's own gate, and none of it is complete:

1. **Remove `DEMO_OPEN_LOGIN` and redeploy**, closing the open demo login (§1.3).
2. Obtain district sign-off on the hosting arrangement and at-rest encryption (§10, item 5).
3. Execute any required data privacy agreement or vendor review, including with the hosting
   and database providers (§10, item 7).
4. Verify Clever scopes against district policy and obtain the Clever client credential,
   which has not yet been issued (§10, item 2).
5. Set production retention windows (§10, item 6).
6. Rotate all credentials.
7. Test backup and restore.
8. Confirm the parent-identity policy before enabling any parent account (§10, item 4).

---

## 9. Current status and known limitations

This section is deliberate and complete to the best of the developer's knowledge. Every item
was verified while preparing this packet. It is included because a review committee that
finds an undisclosed gap is right to discount everything else in the document.

### 9.1 The public demo login is currently open

As described in §1.3: any visitor to mycivicsclass.com can currently sign in as any role,
including administrator, with one click. The database holds synthetic data only and has never
held real student information. Closing it is one environment variable and a redeploy, and is
item 1 on the go-live checklist. It can be closed on request at any time.

### 9.2 Content coverage is one unit, not the full course

Measured against the live database on August 3, 2026: **8 of 36 benchmarks have any approved
assessment items, and 7 of those meet the 30-item standard.** SS.7.CG.1.7 has 48 items;
SS.7.CG.1.10 has 12; the remaining 28 benchmarks have none authored yet. Eight guided lessons
are approved. Additionally, the content for the official SS.7.CG.1.1 and 1.2 is interim
material the developer has already flagged for a full rebuild.

This is the single largest gap in the application and is the reason §1.4 requests a
single-classroom pilot. The instructional framework, assessment engine, remediation engine,
and analytics are complete and tested; the content library is not.

### 9.3 All manual accessibility testing is outstanding

Automated scanning passes on seven pages. **Manual verification has not been performed** —
specifically keyboard-only navigation through a complete mission, screen-reader testing with
VoiceOver, 200% browser zoom, and a check for information conveyed by color alone. These are
tracked as open items in the project's own deferred-verification ledger across four
development phases. Automated scanning catches a meaningful subset of accessibility defects;
it is not a substitute for these, and this packet does not claim WCAG 2.1 AA conformance has
been verified.

The developer would welcome district accessibility staff review, which would be more
authoritative than self-testing.

### 9.4 A known WCAG 2.1 AA deviation

The application's explanatory hover popovers, which define jargon on hover, respond to
**mouse hover only** — they cannot be opened by keyboard or by touch. This is a genuine AA
failure. It is documented as a deliberate, developer-approved trade-off made for delivery
speed, with the follow-up marked required rather than optional.

Its scope is bounded: these popovers carry supplementary explanation only, nothing is gated
behind them, no task requires one to be read, and the separate vocabulary glossary popovers —
which carry instructional content — are fully keyboard and touch accessible. The fix is
understood and small. It is disclosed rather than omitted because it is exactly the kind of
thing an accessibility review should find, and finding it undisclosed would be worse.

### 9.5 Automated accessibility scanning does not cover every page

The scan covers seven pages. It does **not** cover the assessment player, the parent portal
pages, the source-analysis lab, the cumulative-review hub, or the Focus Mode fullscreen state.

One specific defect in the test suite is disclosed: a test **named** "assessment player has no
WCAG violations" in fact navigates to the student dashboard and scans that instead. The
navigation into a live assessment was never implemented. The test passes, but it does not
test what its name says. The assessment player is therefore unscanned.

### 9.6 Seven accommodation codes have no enforcement code

All fifteen codes in §7.2 can be granted by a teacher and are audit-logged, but only eight
have implementing code.

Three of the remaining seven are **redundant rather than broken**: read-aloud, sentence
chunking, and academic vocabulary popovers are available to every student unconditionally, so
granting the code adds nothing because the support is already present. Background context
cards are documented as a deferred feature.

**Three are genuinely unimplemented behavior behind an IEP-style label**, and must not be
read as working:

- **ACC-EXT-TIME (extended time)** — no time multiplier is implemented anywhere.
- **ACC-REDUCED-CHOICES (reduced answer choices)** — items always present four options.
- **ACC-SCREEN-READER** — no code keys off this grant; screen-reader support depends on the
  application's general markup quality, which is partially verified (§9.3).

This matters beyond documentation accuracy: a teacher could grant extended time to a student
whose IEP requires it and reasonably believe it had taken effect. The developer regards this
as the highest-priority functional gap in the application and will address it before pilot
use with any student holding those accommodations. It is disclosed here rather than after the
fact.

### 9.7 Translation review status

The 71 Spanish glosses are marked approved in the database, but that approval was a
developer directive, **not a review by a Spanish-proficient reviewer**. They should be treated
as unreviewed translations until a qualified reviewer signs off. The developer would welcome
review by district ESOL staff.

Haitian Creole is 8 terms — a proof that the pipeline works, not usable coverage — and 7 of
the 8 are still pending review and therefore invisible to students.

### 9.8 Item tagging is enforced for 8 of the 10 required tags

The tag validator unconditionally enforces benchmark, reporting category, cognitive
complexity, skill tag, remediation tag, source tier, approval status, and a valid
reading-load level. **Stimulus type is enforced only when an item has an attached stimulus**,
and **misconception identifier is declared but never actually validated** — an item can
therefore be approved without one, which weakens the diagnostic remediation for that item.

Separately, the integration test that runs the validator across the live bank is **scoped to
strand 1 only**. As strands 2 and 3 are authored, that scope needs to widen or new content
will not be covered by the check.

### 9.9 Two retention gaps

**Student- and teacher-submitted suggestion text is covered by no retention window** and is
currently retained indefinitely. This is flagged as an open decision in the project's
retention document. It is free text authored by minors and should have a defined window; the
developer will add one, and welcomes a district-specified duration.

**There is no scheduler.** The retention purge is run manually or from the command line. A
retention window that is set but never executed does not delete anything. Automating this is
open work.

### 9.10 The Content-Security-Policy is not maximally strict

The policy in §6.1 permits inline scripts and inline styles. This is a real weakening: it
means the policy would not, on its own, stop a cross-site-scripting payload that managed to
get injected into a page.

The reason is that the web framework injects inline bootstrap scripts and inline font styles
of its own; eliminating them requires per-request cryptographic nonces threaded through the
document. That work is understood and scheduled. It is worth being precise about what the
current policy does still accomplish, which is substantial: no external script may load, no
frame from any host but the sanctioned video player may load, and **no outbound connection to
any external host is permitted** — the property that matters most for the no-telemetry
commitment. The application also has no user-generated HTML rendering path, which is the usual
source of injection: student-submitted text is rendered as text, never as markup.

### 9.11 Sessions cannot be revoked server-side

Sessions are stateless signed tokens with no server-side session store. Signing out clears
the cookie in that browser, but a token copied off a device remains valid until it expires.
The eight-hour lifetime added during this review is the mitigation available without adding a
database-backed session store. If the district requires immediate server-side session
revocation, that is a known and achievable change.

### 9.12 No district agreements are in place

No data privacy agreement has been executed. No agreement is in place with the hosting or
database providers. The hosting arrangement has not been approved. OAuth scopes are documented
but have not been verified against district policy. The Clever client credential has not been
issued. All of these are in §10, and all of them gate real student use rather than gating
this review.

### 9.13 Verification methodology and its honest boundaries

The project uses a tiered verification standard, documented in its architecture decision
record 0006. Type checking and the automated test suite are **blocking** — a development
phase is not considered complete unless they pass. Production build, automated accessibility
scanning, and manual accessibility testing are **non-blocking** and are tracked in a written
ledger of deferred items.

The practical consequence, stated plainly: **automated verification is genuinely enforced;
manual verification is developer-attested and, for the accessibility items in §9.3, still
outstanding.** The ledger of deferred items is part of the repository and available to the
district.

Current automated verification status, run August 3, 2026:

| Check | Result |
|---|---|
| TypeScript type check | 0 errors |
| Automated test suite | **1,646 tests passed, 2 intentionally skipped, across 153 test suites** — all four shards exited successfully |
| Test files | 153 unit and integration files, plus 6 browser end-to-end files |
| Automated accessibility scan | Zero WCAG 2.0/2.1 A and AA violations on 7 pages (see §9.5 for coverage limits) |

---

## 10. Requested district confirmations

Nine questions the developer cannot answer. Each is paired with the document that will be
completed once the district answers, and each blocks real student use rather than blocking
this review.

| # | Question | Completes |
|---|---|---|
| 1 | What is the approval process for a custom instructional application developed by a district employee? Is a vendor review required for software with no vendor? | This packet's disposition |
| 2 | May Clever integration be used, and at what data scopes? The application requests `read:user_id`, `read:students`, `read:teachers` only. | `docs/oauth-scopes.md`; unblocks the Clever credential |
| 3 | Is Google OAuth acceptable as a staff fallback, at `openid`/`email`/`profile` scope? | `docs/oauth-scopes.md` |
| 4 | Is external parent or guardian login permitted, and what identity verification is required? Who is authorized to verify a guardian relationship? | `docs/parent-identity-policy.md`; unblocks the parent portal |
| 5 | What hosting and data-storage arrangement is acceptable for student progress and assessment data? Is the current managed arrangement acceptable, or is district-owned tenancy required? | `docs/hosting-plan.md` |
| 6 | What retention windows should apply to audit logs, voided assessment attempts, activity-session records, and student-submitted feedback text? | `docs/data-retention.md` |
| 7 | Is a district privacy agreement or data processing agreement required, and with which parties? | `docs/privacy-review.md` §5 |
| 8 | Is AI-assisted drafting of assessment items permitted, and does it require a reviewer other than the teacher of record? | `docs/adrs/0013` scope |
| 9 | Are the accessibility supports in §7 sufficient, and can district accessibility staff perform the manual review described in §9.3? | `docs/audits/deferred/` closure |

Two further items are noted for completeness: the district pacing guide has not been imported
into the curriculum sequence, and confirmation is requested that game elements and a
class-level collective progress display are acceptable under classroom and district norms.
Note that the application deliberately does **not** display public individual score
leaderboards.

---

## Appendix A — Audited actions

36 distinct actions are recorded in the audit log with actor, entity, timestamp, and metadata:

**Content:** approve, archive, bulk-approve by tag, lesson step added, removed, reordered,
content edited, lesson media uploaded, lesson media visibility changed.

**Student records:** accommodation set, teacher override (unlock benchmark, mark mastered,
mark exposure complete, assign remediation, extend deadline, custom), off-ramp triggered,
attempt reset/voided, strategy requirement overridden, class re-priming triggered.

**Access and identity:** student login, parent login, parent account created, parent link
created, parent link status changed, substitute mode toggled, substitute notes set.

**Data movement:** report exported, audit log exported, parent summary shared, retention
purge.

**Assessment and analytics:** cumulative review session started, session submitted, class
configuration updated, EOC score imported, EOC score batch imported, calibration run created,
calibration weights approved.

## Appendix B — Feature flags and defaults

Capabilities with policy implications are disabled by default and cannot be enabled by
accident:

| Flag | Default | Gates |
|---|---|---|
| `FEATURE_PARENT_PORTAL` | **Off** | All parent login and parent pages. Held off pending §10 item 4. |
| `FEATURE_SECURE_ASSESSMENT` | **Off** | Focus Mode. Also requires a separate per-class teacher opt-in. |
| `FEATURE_L1_GLOSSES` | **Off** | First-language glossaries. |
| `FEATURE_EOC_REVIEW` | Off | Cumulative review mode. |
| `FEATURE_LEADERBOARDS` | **Off** | Reserved and not implemented. Public individual score leaderboards are prohibited by the project's own rules. |
| `FEATURE_AI_DRAFTING` | Off | Reserved and not implemented. |
| `DEMO_OPEN_LOGIN` | Off by default; **currently on** in the evaluation deployment | The open demo login (§1.3, §9.1). |
| `MOCK_AUTH` | Development only | Ignored entirely in production. |

## Appendix C — Supporting documents available on request

| Document | Contents |
|---|---|
| `docs/privacy-review.md` | Data inventory and control mapping, with the district sign-off checklist |
| `docs/hosting-plan.md` | Hosting options compared, with security requirements |
| `docs/oauth-scopes.md` | Exact SSO scopes requested and why |
| `docs/data-retention.md` | Retention classes, defaults, and purge behavior |
| `docs/parent-identity-policy.md` | Parent verification flow, awaiting district input |
| `docs/chromebook-lockdown.md` | Hand-to-IT runbook for GoGuardian-based assessment lockdown |
| `docs/deployment-vercel.md` | Deployment procedure and go-live checklist |
| `docs/deployment-credentials.md` | Credential inventory and rotation procedures (no values) |
| `docs/runbook.md` | Operational runbook and environment reference |
| `docs/adrs/` | 21 architecture decision records, including the standards realignment (0017), assessment integrity (0020), activity monitoring (0019), and the verification standard (0006) |
| `docs/audits/` | Nine phase audit checklists and six deferred-verification ledgers |
| `civics_quest_v3_build_spec.md` | The full build specification, including §25 on data and privacy |

---

## Closing note

This application was built by a classroom teacher for use in their own classroom. It has not
been through external security testing or an independent accessibility audit, and this packet
does not present it as though it has. What it does present is an application built to an
explicit set of rules — server-side grading only, answer keys never exposed, least-privilege
access, no third-party telemetry, accessibility as a requirement — with automated tests that
enforce those rules on every change, and a written record of every place the implementation
currently falls short.

The developer would rather have the district find the gaps in §9 in this document than in the
application. Any of them can be discussed, and the ones within the developer's control can be
fixed before a pilot begins.

**Arthur Danison III**
arthur.danisoniii@palmbeachschools.org
*[School]* — Palm Beach County School District
August 3, 2026
