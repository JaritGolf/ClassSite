-- Assessment integrity: records that a student left a secure assessment or
-- attempted a blocked input, so a teacher can SEE it without the app ever
-- auto-punishing the student.
-- See docs/adrs/0020-assessment-integrity-and-device-lockdown.md.
--
-- Additive only: one new table plus one nullable-with-default column on
-- classes. No existing column is altered and nothing is backfilled — the
-- feature is inert until FEATURE_SECURE_ASSESSMENT is set AND a teacher turns
-- secure_assessment_mode on for a class.

CREATE TABLE IF NOT EXISTS "attempt_integrity_events" (
  "id"          TEXT NOT NULL,
  "attempt_id"  TEXT NOT NULL,
  "event_type"  TEXT NOT NULL,
  -- Client-reported time away in ms. Advisory only: the client is the only
  -- party that can observe how long its own tab was hidden, so this is never
  -- treated as authoritative. Null for instantaneous events.
  "duration_ms" INTEGER,
  -- Server clock. The client never supplies a timestamp.
  "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "attempt_integrity_events_pkey" PRIMARY KEY ("id")
);

-- Every read is "all events for this attempt" (summarize for the teacher's
-- attempt row) and the retention purge deletes by attempt.
CREATE INDEX IF NOT EXISTS "attempt_integrity_events_attempt_id_idx"
  ON "attempt_integrity_events" ("attempt_id");

DO $$
BEGIN
  ALTER TABLE "attempt_integrity_events"
    ADD CONSTRAINT "attempt_integrity_events_attempt_id_fkey"
    FOREIGN KEY ("attempt_id") REFERENCES "assessment_attempts" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Per-class opt-in for Focus Mode on secure assessments. Default false so
-- existing classes are untouched.
ALTER TABLE "classes"
  ADD COLUMN IF NOT EXISTS "secure_assessment_mode" BOOLEAN NOT NULL DEFAULT false;
