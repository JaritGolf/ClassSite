# My Civics Class — What the App Holds and Does Not Hold

This replaces the earlier privacy review, which described a version of the app
that collected student data. This version does not. The statements below are
enforced by code and by tests that fail if they stop being true
(`tests/unit/guards/no-student-data.test.ts`).

This is a description of the software. It is not legal advice, and whether a
privacy agreement is needed is the district's decision to make.

## Summary

- Students have **no accounts**. There is no sign-in, class code, nickname or
  student number. A student opens the site and starts.
- The server **stores nothing about any student**. The database has no student
  table, no coded or pseudonymous student rows, no attempts, no scores, no
  progress and no settings for a student.
- A student's progress is kept **in that student's own browser**, and in a file
  the student can choose to save. The site never uploads it.
- The only account is the **teacher's**, used to write and arrange lessons.

## What the database holds

27 tables, in three groups.

| Group | Contents |
|---|---|
| Curriculum | Units, benchmarks, lessons and lesson steps, vocabulary terms and translations, questions and answer options, reading passages, assessments (as lists of questions), remediation activities, misconceptions, badge definitions, resources, teacher-uploaded lesson images |
| Teacher account | The teacher's name, email address and Google account id; an active/inactive status; a role (teacher or admin) |
| Teacher's working records | Classes (a label for a lesson arrangement — a class has no roster), per-class lesson arrangements, and an audit log of the teacher's own actions (for example "approved a question") |

There is nothing else. The migration that removed the student tables is
`prisma/migrations/20261116120000_no_student_data`.

## What a student's browser sends to the server

To grade work, the browser sends the server only what is needed to grade it:

- which questions were answered and which answer option was chosen
- for Mastery Challenges and the Republic Challenge, a three-level confidence
  rating per answer ("Not sure" / "Pretty sure" / "Very sure")
- for practice and review, which benchmarks are due and the ids of questions
  already seen or missed on that device, so the server can pick a fresh one
- a signed token proving a Readiness Check was passed (it names a benchmark and
  a date, not a person)

The server answers with a score and feedback, and **keeps none of it**. These
routes read no session, set no cookie and write nothing to the database.

None of those requests contains a name, email, student number, class, or any
identifier for the student or the device. The request schemas have no field
that could carry one, and unknown fields are discarded before use.

## What stays on the student's device

Saved in the browser's local storage, under one key:

- mission progress and mastery status, scores and dates
- completion codes earned
- spaced-review schedule, streak, badges earned
- which display options are switched on (read aloud, one sentence per line,
  high contrast, large text, extra time, less motion) and the glossary language
  chosen (English only, Spanish, or Haitian Creole)

It contains no name. A student can save it to a file and load it on another
device; the file has the same contents and no name, and the site does not
receive it. Clearing the browser's site data, or using "Erase progress on this
device" in Settings, deletes it.

The display options are choices any student can make. Nobody grants them, they
carry no label such as ELL or ESE, and the server is never told which are on.
The server sends every approved glossary translation and the device shows the
one the student picked.

## Completion codes

When a student passes a Mastery Challenge the server returns a short code, for
example `MCC-1.1-100-20260914-7K2M9XD4AQ`. It encodes the benchmark, the score
and the date, and is signed so it cannot be typed up by hand. The student
pastes it into the Google Classroom assignment. The teacher pastes codes into
the "Check codes" page, which confirms each is genuine.

- A code does not say who earned it. Two students who master the same benchmark
  with the same score on the same day receive the same code.
- The server stores no codes. Checking a code recomputes its signature.
- The check page sends only the codes. If a teacher pastes a column that also
  contains names, the names are stripped out in the teacher's browser and are
  not sent.
- The link between a student and a code exists only in Google Classroom.

## Things a reviewer should know that are not zero

These are stated plainly so that nobody is surprised later.

1. **Web server logs.** Like every website, the hosting provider records
   routine request logs: time, the address of the page or route requested, and
   the visitor's IP address. The application does not read, store or use IP
   addresses or browser details, and the page addresses contain benchmark codes
   (such as `SS.7.CG.1.1`), not anything about a student. How long the host
   keeps those logs is set by the host, not by this app.
2. **Lesson videos.** A lesson may include a video hosted by YouTube's
   privacy-enhanced player. Nothing loads from YouTube until a student clicks
   the video. When they do, their browser contacts YouTube directly. No other
   outside service is contacted: there is no analytics, advertising or tracking
   code, and the browser is instructed to refuse connections to other sites.
3. **The teacher's own content.** Lesson text, uploaded images and substitute
   notes are written by the teacher and stored. The teacher must not put a
   student's name or picture in them.
4. **The device is the record.** Anyone using the same browser profile sees the
   progress saved there. On a district Chromebook each student signs in to
   their own profile, so progress is separate. On a shared or guest device,
   use "Erase progress on this device" when finished.
5. **Not yet applied to the live site.** This version exists on the
   `no-student-data` branch. The removal of student tables has been run on
   local and test databases only. Until it is deployed and the migration is run
   on the production database, the live site still holds its earlier (demo)
   data.

## What this design gives up

- The teacher cannot see a student's progress, scores or answers in the app.
  There is no roster, gradebook, report, or parent view.
- The site cannot stop a student from retaking an assessment, and it cannot
  tell whether a completion code was earned by the student who turned it in.
- If a device is wiped and the student did not save a file, that progress is
  gone.
- Per-student supports cannot be assigned by a teacher; every option is
  available to every student to switch on.

## How it is kept true

`tests/unit/guards/no-student-data.test.ts` runs with every test run and fails
if:

- a model or field linked to a student appears in the database schema
- a student-facing route reads a session, touches a cookie, or writes to the
  database — checked through every file the route imports
- a student page reads a session or sets a cookie
- a student request schema gains a field that could identify someone
- any removed feature (parent portal, rosters, accommodations, activity
  tracking, suggestion box, score import) reappears

`tests/integration/stateless-assessment.test.ts` and
`tests/integration/stateless-modes.test.ts` count the rows in every table
before and after delivering and grading assessments, and require the counts to
be identical.
