-- Student activity sessions: answers "when was this student on the platform,
-- how long were they working, and what did they get done in that session".
-- See docs/adrs/0019-student-activity-sessions.md.
--
-- Additive only: one new table plus two indexes that make the session-window
-- progress-attribution queries cheap. No existing column is altered.

CREATE TABLE IF NOT EXISTS "student_activity_sessions" (
  "id"               TEXT NOT NULL,
  "student_id"       TEXT NOT NULL,
  "started_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_active_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ended_at"         TIMESTAMP(3),
  "active_seconds"   INTEGER NOT NULL DEFAULT 0,
  "area_seconds"     JSONB,
  "started_by_login" BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT "student_activity_sessions_pkey" PRIMARY KEY ("id")
);

-- Report queries are always (student, time-range) scoped.
CREATE INDEX IF NOT EXISTS "student_activity_sessions_student_id_started_at_idx"
  ON "student_activity_sessions" ("student_id", "started_at");

-- Live-presence lookup and the lazy idle-close sweep both scan on recency.
CREATE INDEX IF NOT EXISTS "student_activity_sessions_last_active_at_idx"
  ON "student_activity_sessions" ("last_active_at");

DO $$
BEGIN
  ALTER TABLE "student_activity_sessions"
    ADD CONSTRAINT "student_activity_sessions_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "students" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Session-window progress attribution: "which assessments did this student
-- submit between startedAt and lastActiveAt".
CREATE INDEX IF NOT EXISTS "assessment_attempts_student_id_submitted_at_idx"
  ON "assessment_attempts" ("student_id", "submitted_at");

-- Same, for daily-drill reviews. spaced_review_events previously had NO index
-- at all, so this also speeds up every existing per-student event query.
CREATE INDEX IF NOT EXISTS "spaced_review_events_student_id_occurred_at_idx"
  ON "spaced_review_events" ("student_id", "occurred_at");
