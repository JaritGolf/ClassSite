-- =============================================================================
-- no-student-data: remove every table, column and enum value that holds, or
-- exists only to hold, information about a student or a parent.
--
-- AFTER THIS MIGRATION the database holds curriculum content and the teacher
-- account. Student progress lives only in each student's own browser.
--
-- !! DESTRUCTIVE AND NOT REVERSIBLE !!
-- This DROPS student records: accounts, enrollments, attempts and responses,
-- progress, remediation, spaced-review state, badges, accommodations, activity
-- sessions, suggestions, EOC scores, parent links, overrides. There is no down
-- migration and no export step. Take a backup first if any of that data must
-- be kept or returned to families, and run it only on a database you have
-- decided to clear. It has been applied to local/test databases ONLY.
-- =============================================================================

-- DropForeignKey
ALTER TABLE "adaptive_session_states" DROP CONSTRAINT "adaptive_session_states_attempt_id_fkey";

-- DropForeignKey
ALTER TABLE "assessment_attempts" DROP CONSTRAINT "assessment_attempts_assessment_id_fkey";

-- DropForeignKey
ALTER TABLE "assessment_attempts" DROP CONSTRAINT "assessment_attempts_student_id_fkey";

-- DropForeignKey
ALTER TABLE "assessments" DROP CONSTRAINT "assessments_benchmark_id_fkey";

-- DropForeignKey
ALTER TABLE "assignments" DROP CONSTRAINT "assignments_assessment_id_fkey";

-- DropForeignKey
ALTER TABLE "assignments" DROP CONSTRAINT "assignments_benchmark_id_fkey";

-- DropForeignKey
ALTER TABLE "assignments" DROP CONSTRAINT "assignments_class_id_fkey";

-- DropForeignKey
ALTER TABLE "attempt_integrity_events" DROP CONSTRAINT "attempt_integrity_events_attempt_id_fkey";

-- DropForeignKey
ALTER TABLE "attempt_responses" DROP CONSTRAINT "attempt_responses_attempt_id_fkey";

-- DropForeignKey
ALTER TABLE "attempt_responses" DROP CONSTRAINT "attempt_responses_question_id_fkey";

-- DropForeignKey
ALTER TABLE "attempt_responses" DROP CONSTRAINT "attempt_responses_selected_option_id_fkey";

-- DropForeignKey
ALTER TABLE "class_enrollments" DROP CONSTRAINT "class_enrollments_class_id_fkey";

-- DropForeignKey
ALTER TABLE "class_enrollments" DROP CONSTRAINT "class_enrollments_student_id_fkey";

-- DropForeignKey
ALTER TABLE "class_readiness_snapshots" DROP CONSTRAINT "class_readiness_snapshots_class_id_fkey";

-- DropForeignKey
ALTER TABLE "class_readiness_snapshots" DROP CONSTRAINT "class_readiness_snapshots_reporting_category_id_fkey";

-- DropForeignKey
ALTER TABLE "classes" DROP CONSTRAINT "classes_progress_plan_id_fkey";

-- DropForeignKey
ALTER TABLE "confidence_calibration_snapshots" DROP CONSTRAINT "confidence_calibration_snapshots_student_id_fkey";

-- DropForeignKey
ALTER TABLE "eoc_actual_scores" DROP CONSTRAINT "eoc_actual_scores_student_id_fkey";

-- DropForeignKey
ALTER TABLE "eoc_readiness_snapshots" DROP CONSTRAINT "eoc_readiness_snapshots_reporting_category_id_fkey";

-- DropForeignKey
ALTER TABLE "eoc_readiness_snapshots" DROP CONSTRAINT "eoc_readiness_snapshots_student_id_fkey";

-- DropForeignKey
ALTER TABLE "narrative_progress" DROP CONSTRAINT "narrative_progress_student_id_fkey";

-- DropForeignKey
ALTER TABLE "narrative_progress" DROP CONSTRAINT "narrative_progress_unit_id_fkey";

-- DropForeignKey
ALTER TABLE "parent_student_links" DROP CONSTRAINT "parent_student_links_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "parent_student_links" DROP CONSTRAINT "parent_student_links_student_id_fkey";

-- DropForeignKey
ALTER TABLE "parents" DROP CONSTRAINT "parents_user_id_fkey";

-- DropForeignKey
ALTER TABLE "progress_checkpoint_targets" DROP CONSTRAINT "progress_checkpoint_targets_benchmark_id_fkey";

-- DropForeignKey
ALTER TABLE "progress_checkpoint_targets" DROP CONSTRAINT "progress_checkpoint_targets_checkpoint_id_fkey";

-- DropForeignKey
ALTER TABLE "progress_checkpoints" DROP CONSTRAINT "progress_checkpoints_plan_id_fkey";

-- DropForeignKey
ALTER TABLE "progress_plans" DROP CONSTRAINT "progress_plans_teacher_id_fkey";

-- DropForeignKey
ALTER TABLE "source_decoder_progress" DROP CONSTRAINT "source_decoder_progress_student_id_fkey";

-- DropForeignKey
ALTER TABLE "spaced_review_events" DROP CONSTRAINT "spaced_review_events_benchmark_id_fkey";

-- DropForeignKey
ALTER TABLE "spaced_review_events" DROP CONSTRAINT "spaced_review_events_question_id_fkey";

-- DropForeignKey
ALTER TABLE "spaced_review_events" DROP CONSTRAINT "spaced_review_events_student_id_fkey";

-- DropForeignKey
ALTER TABLE "spaced_review_state" DROP CONSTRAINT "spaced_review_state_benchmark_id_fkey";

-- DropForeignKey
ALTER TABLE "spaced_review_state" DROP CONSTRAINT "spaced_review_state_student_id_fkey";

-- DropForeignKey
ALTER TABLE "strategy_track_progress" DROP CONSTRAINT "strategy_track_progress_student_id_fkey";

-- DropForeignKey
ALTER TABLE "streak_states" DROP CONSTRAINT "streak_states_student_id_fkey";

-- DropForeignKey
ALTER TABLE "student_accommodations" DROP CONSTRAINT "student_accommodations_accommodation_id_fkey";

-- DropForeignKey
ALTER TABLE "student_accommodations" DROP CONSTRAINT "student_accommodations_student_id_fkey";

-- DropForeignKey
ALTER TABLE "student_activity_sessions" DROP CONSTRAINT "student_activity_sessions_student_id_fkey";

-- DropForeignKey
ALTER TABLE "student_badges" DROP CONSTRAINT "student_badges_badge_id_fkey";

-- DropForeignKey
ALTER TABLE "student_badges" DROP CONSTRAINT "student_badges_student_id_fkey";

-- DropForeignKey
ALTER TABLE "student_checkpoint_levels" DROP CONSTRAINT "student_checkpoint_levels_checkpoint_id_fkey";

-- DropForeignKey
ALTER TABLE "student_checkpoint_levels" DROP CONSTRAINT "student_checkpoint_levels_student_id_fkey";

-- DropForeignKey
ALTER TABLE "student_last_activity" DROP CONSTRAINT "student_last_activity_student_id_fkey";

-- DropForeignKey
ALTER TABLE "student_progress" DROP CONSTRAINT "student_progress_benchmark_id_fkey";

-- DropForeignKey
ALTER TABLE "student_progress" DROP CONSTRAINT "student_progress_current_step_id_fkey";

-- DropForeignKey
ALTER TABLE "student_progress" DROP CONSTRAINT "student_progress_student_id_fkey";

-- DropForeignKey
ALTER TABLE "student_remediations" DROP CONSTRAINT "student_remediations_remediation_item_id_fkey";

-- DropForeignKey
ALTER TABLE "student_remediations" DROP CONSTRAINT "student_remediations_student_id_fkey";

-- DropForeignKey
ALTER TABLE "student_strategy_override" DROP CONSTRAINT "student_strategy_override_student_id_fkey";

-- DropForeignKey
ALTER TABLE "student_ui_settings" DROP CONSTRAINT "student_ui_settings_student_id_fkey";

-- DropForeignKey
ALTER TABLE "students" DROP CONSTRAINT "students_user_id_fkey";

-- DropForeignKey
ALTER TABLE "suggestions" DROP CONSTRAINT "suggestions_author_student_id_fkey";

-- DropForeignKey
ALTER TABLE "suggestions" DROP CONSTRAINT "suggestions_author_user_id_fkey";

-- DropForeignKey
ALTER TABLE "suggestions" DROP CONSTRAINT "suggestions_class_id_fkey";

-- DropForeignKey
ALTER TABLE "suggestions" DROP CONSTRAINT "suggestions_reviewed_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "suggestions" DROP CONSTRAINT "suggestions_teacher_id_fkey";

-- DropForeignKey
ALTER TABLE "teacher_overrides" DROP CONSTRAINT "teacher_overrides_student_id_fkey";

-- DropForeignKey
ALTER TABLE "teacher_overrides" DROP CONSTRAINT "teacher_overrides_teacher_id_fkey";

-- ---------------------------------------------------------------------------
-- Data clean-up (runs after the foreign keys above are dropped).
-- ---------------------------------------------------------------------------

-- Audit rows can carry student ids, parent logins and per-student actions in
-- their metadata. None of it may survive, so the log starts over.
TRUNCATE TABLE "audit_logs";

-- Republic Challenge sessions used to be stored as one throwaway assessment per
-- student sitting. They are per-student artefacts, not curriculum.
DELETE FROM "assessment_questions"
 WHERE "assessment_id" IN (
   SELECT "id" FROM "assessments"
    WHERE "benchmark_id" IS NULL
      AND "assessment_type" IN ('REPUBLIC_CHALLENGE', 'FINAL_TRIAL')
 );
DELETE FROM "assessments"
 WHERE "benchmark_id" IS NULL
   AND "assessment_type" IN ('REPUBLIC_CHALLENGE', 'FINAL_TRIAL');

-- DropIndex
DROP INDEX "users_clever_id_key";

-- AlterTable
ALTER TABLE "assessments" DROP COLUMN "mode";

-- AlterTable
ALTER TABLE "classes" DROP COLUMN "progress_plan_id",
DROP COLUMN "rc_attempts_allowed",
DROP COLUMN "rc_review_window",
DROP COLUMN "secure_assessment_mode";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "clever_id";

-- DropTable
DROP TABLE "accommodations" CASCADE;

-- DropTable
DROP TABLE "adaptive_session_states" CASCADE;

-- DropTable
DROP TABLE "assessment_attempts" CASCADE;

-- DropTable
DROP TABLE "assignments" CASCADE;

-- DropTable
DROP TABLE "attempt_integrity_events" CASCADE;

-- DropTable
DROP TABLE "attempt_responses" CASCADE;

-- DropTable
DROP TABLE "class_enrollments" CASCADE;

-- DropTable
DROP TABLE "class_readiness_snapshots" CASCADE;

-- DropTable
DROP TABLE "confidence_calibration_snapshots" CASCADE;

-- DropTable
DROP TABLE "eoc_actual_scores" CASCADE;

-- DropTable
DROP TABLE "eoc_calibration_runs" CASCADE;

-- DropTable
DROP TABLE "eoc_readiness_snapshots" CASCADE;

-- DropTable
DROP TABLE "narrative_progress" CASCADE;

-- DropTable
DROP TABLE "parent_student_links" CASCADE;

-- DropTable
DROP TABLE "parents" CASCADE;

-- DropTable
DROP TABLE "progress_checkpoint_targets" CASCADE;

-- DropTable
DROP TABLE "progress_checkpoints" CASCADE;

-- DropTable
DROP TABLE "progress_plans" CASCADE;

-- DropTable
DROP TABLE "source_decoder_progress" CASCADE;

-- DropTable
DROP TABLE "spaced_review_events" CASCADE;

-- DropTable
DROP TABLE "spaced_review_state" CASCADE;

-- DropTable
DROP TABLE "strategy_track_progress" CASCADE;

-- DropTable
DROP TABLE "streak_states" CASCADE;

-- DropTable
DROP TABLE "student_accommodations" CASCADE;

-- DropTable
DROP TABLE "student_activity_sessions" CASCADE;

-- DropTable
DROP TABLE "student_badges" CASCADE;

-- DropTable
DROP TABLE "student_checkpoint_levels" CASCADE;

-- DropTable
DROP TABLE "student_last_activity" CASCADE;

-- DropTable
DROP TABLE "student_progress" CASCADE;

-- DropTable
DROP TABLE "student_remediations" CASCADE;

-- DropTable
DROP TABLE "student_strategy_override" CASCADE;

-- DropTable
DROP TABLE "student_ui_settings" CASCADE;

-- DropTable
DROP TABLE "students" CASCADE;

-- DropTable
DROP TABLE "suggestions" CASCADE;

-- DropTable
DROP TABLE "teacher_overrides" CASCADE;

-- Student and parent accounts. (Their dependent rows lived in the tables dropped
-- above.) Staff accounts are untouched.
DELETE FROM "users" WHERE "role" IN ('STUDENT', 'PARENT');

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('TEACHER', 'ADMIN');
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";
COMMIT;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_benchmark_id_fkey" FOREIGN KEY ("benchmark_id") REFERENCES "benchmarks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropEnum
DROP TYPE "AssignmentStatus";

-- DropEnum
DROP TYPE "EnrollmentStatus";

-- DropEnum
DROP TYPE "ParentVerifiedStatus";

-- DropEnum
DROP TYPE "RemediationStatus";

-- DropEnum
DROP TYPE "RepublicChallengeMode";

-- DropEnum
DROP TYPE "StudentActivityType";

-- DropEnum
DROP TYPE "StudentProgressStatus";

-- DropEnum
DROP TYPE "SuggestionAudience";

-- DropEnum
DROP TYPE "SuggestionKind";

-- DropEnum
DROP TYPE "SuggestionStatus";

-- DropEnum
DROP TYPE "TeacherOverrideAction";

