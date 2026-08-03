-- Track the area of a session's most recent touch, separately from the
-- accumulated per-area seconds.
--
-- The live "working right now" panel needs "where is this student now", which is
-- not the same question as "where did their time go": a student who spent 30
-- minutes on missions and then opened the daily drill is on the drill, and a
-- student who just arrived has a current area but no accumulated seconds yet.

ALTER TABLE "student_activity_sessions"
  ADD COLUMN IF NOT EXISTS "last_area" TEXT;
