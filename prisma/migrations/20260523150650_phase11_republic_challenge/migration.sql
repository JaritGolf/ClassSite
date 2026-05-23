-- Phase 11 Republic Challenge:
--   1. Add RepublicChallengeMode enum.
--   2. Add Assessment.mode column.
--   3. Make Assessment.benchmark_id nullable (Republic Challenge spans benchmarks).
--   4. Add Class config columns for per-class Republic Challenge settings.

CREATE TYPE "RepublicChallengeMode" AS ENUM (
  'QUICK_REVIEW',
  'CATEGORY_CHALLENGE',
  'MIXED_MISSION',
  'MISTAKE_REPLAY',
  'SOURCE_SPRINT',
  'ENDURANCE_TRIAL',
  'FINAL_REPUBLIC_TRIAL'
);

ALTER TABLE "assessments"
  ADD COLUMN "mode" "RepublicChallengeMode";

ALTER TABLE "assessments"
  ALTER COLUMN "benchmark_id" DROP NOT NULL;

ALTER TABLE "classes"
  ADD COLUMN "rc_session_length_override" INTEGER,
  ADD COLUMN "rc_attempts_allowed" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "rc_review_window" TEXT NOT NULL DEFAULT 'after_submit',
  ADD COLUMN "rc_stamina_override" INTEGER,
  ADD COLUMN "feature_eoc_review_enabled" BOOLEAN NOT NULL DEFAULT true;
