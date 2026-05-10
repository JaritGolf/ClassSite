-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'TEACHER', 'PARENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'APPROVED', 'NEEDS_REVISION', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SourceTier" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "CognitiveComplexity" AS ENUM ('LOW', 'MODERATE', 'HIGH');

-- CreateEnum
CREATE TYPE "StimulusType" AS ENUM ('NONE', 'EXCERPT', 'CHART', 'MAP', 'TABLE', 'FLOWCHART', 'TIMELINE', 'POLITICAL_CARTOON', 'DIAGRAM', 'SCENARIO', 'IMAGE');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('MULTIPLE_CHOICE', 'SCENARIO_MC', 'SOURCE_MC', 'IMAGE_MC', 'FLOWCHART_MC', 'TIMELINE_MC', 'MATCHING', 'SEQUENCING', 'CATEGORIZATION', 'SELECT_ALL', 'SHORT_ANSWER');

-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('MASTERY_CHALLENGE', 'PRACTICE', 'READINESS_CHECK', 'REPUBLIC_CHALLENGE', 'FINAL_TRIAL', 'REASSESSMENT', 'DIAGNOSTIC');

-- CreateEnum
CREATE TYPE "RemediationType" AS ENUM ('VOCABULARY_TRAINING', 'MINI_LESSON_REPLAY', 'SCENARIO_LAB', 'PRIMARY_SOURCE_COACH', 'VISUAL_EVIDENCE_LAB', 'MISCONCEPTION_FIX', 'BASIC_RETEACH', 'GUIDED_REASONING');

-- CreateEnum
CREATE TYPE "StudentProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'READY_FOR_MASTERY', 'NEEDS_REMEDIATION', 'REMEDIATION_COMPLETE', 'MASTERED', 'EXPOSURE_COMPLETE', 'TEACHER_OVERRIDE', 'INTERVENTION_REQUIRED');

-- CreateEnum
CREATE TYPE "TermTier" AS ENUM ('TIER_2', 'TIER_3');

-- CreateEnum
CREATE TYPE "BenchmarkConnectionType" AS ENUM ('PREREQUISITE', 'CO_REQUISITE', 'EXTENDS', 'SUPPORTS');

-- CreateEnum
CREATE TYPE "LessonStepType" AS ENUM ('VIDEO', 'NOTE', 'INTERACTIVE_CHECK', 'DISCUSSION', 'WORKED_EXAMPLE', 'VOCABULARY', 'SOURCE_ANALYSIS');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('VIDEO', 'ARTICLE', 'PRIMARY_SOURCE', 'INTERACTIVE', 'WORKSHEET', 'REFERENCE');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RemediationStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "BadgeTrack" AS ENUM ('MASTERY', 'READING', 'STRATEGY', 'ENGAGEMENT');

-- CreateEnum
CREATE TYPE "TeacherOverrideAction" AS ENUM ('UNLOCK_BENCHMARK', 'MARK_MASTERED', 'MARK_EXPOSURE_COMPLETE', 'ASSIGN_REMEDIATION', 'EXTEND_DEADLINE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DROPPED');

-- CreateEnum
CREATE TYPE "ParentVerifiedStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "clever_id" TEXT,
    "google_id" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "district_student_id" TEXT,
    "grade_level" INTEGER NOT NULL DEFAULT 7,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "l1_language" TEXT,
    "ell_status" TEXT,
    "reading_level_flag" BOOLEAN NOT NULL DEFAULT false,
    "ese_status" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teachers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "school_id" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "parents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_student_links" (
    "id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "verified_status" "ParentVerifiedStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_student_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "period" TEXT,
    "school_year" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_enrollments" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sequence_order" INTEGER NOT NULL,
    "game_region_name" TEXT NOT NULL,
    "reporting_category_mix" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporting_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "blueprint_weight_min" DOUBLE PRECISION NOT NULL,
    "blueprint_weight_max" DOUBLE PRECISION NOT NULL,
    "description" TEXT,

    CONSTRAINT "reporting_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benchmarks" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "reporting_category_id" TEXT NOT NULL,
    "sequence_order" INTEGER NOT NULL,
    "lesson_summary" TEXT,
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "benchmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benchmark_clarifications" (
    "id" TEXT NOT NULL,
    "benchmark_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sequence_order" INTEGER NOT NULL,

    CONSTRAINT "benchmark_clarifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benchmark_connections" (
    "id" TEXT NOT NULL,
    "benchmark_id" TEXT NOT NULL,
    "connected_benchmark_id" TEXT NOT NULL,
    "relationship_type" "BenchmarkConnectionType" NOT NULL,

    CONSTRAINT "benchmark_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terms" (
    "id" TEXT NOT NULL,
    "benchmark_id" TEXT,
    "term" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "tier" "TermTier" NOT NULL,
    "related_vocab" TEXT,
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "term_translations" (
    "id" TEXT NOT NULL,
    "term_id" TEXT NOT NULL,
    "language_code" TEXT NOT NULL,
    "definition_translated" TEXT NOT NULL,
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "term_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "benchmark_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "resource_type" "ResourceType" NOT NULL,
    "description" TEXT,
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "benchmark_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "student_friendly_target" TEXT NOT NULL,
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_steps" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "step_type" "LessonStepType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sequence_order" INTEGER NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "lesson_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stimuli" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "stimulus_type" "StimulusType" NOT NULL,
    "content" TEXT NOT NULL,
    "media_url" TEXT,
    "source" TEXT,
    "copyright_notes" TEXT,
    "reading_load_level" INTEGER NOT NULL,
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "stimuli_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stimulus_variants" (
    "id" TEXT NOT NULL,
    "stimulus_id" TEXT NOT NULL,
    "reading_load_level" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "stimulus_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "external_key" TEXT,
    "benchmark_id" TEXT NOT NULL,
    "reporting_category_id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "stimulus_id" TEXT,
    "item_type" "ItemType" NOT NULL,
    "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "cognitive_complexity" "CognitiveComplexity" NOT NULL,
    "reading_load_level" INTEGER NOT NULL,
    "skill_tag" TEXT NOT NULL,
    "remediation_tag" TEXT NOT NULL,
    "misconception_id" TEXT,
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'APPROVED',
    "source_tier" "SourceTier" NOT NULL DEFAULT 'B',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "option_text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "feedback" TEXT,
    "misconception_id" TEXT,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "misconceptions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "reporting_category_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "common_distractor_pattern" TEXT,
    "fix_remediation_id" TEXT,
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'APPROVED',

    CONSTRAINT "misconceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "benchmark_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assessment_type" "AssessmentType" NOT NULL,
    "mastery_threshold" DOUBLE PRECISION NOT NULL DEFAULT 0.80,
    "blueprint_json" JSONB,
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_questions" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "sequence_order" INTEGER NOT NULL,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "benchmark_id" TEXT NOT NULL,
    "assessment_id" TEXT,
    "assigned_by" TEXT NOT NULL,
    "start_at" TIMESTAMP(3),
    "due_at" TIMESTAMP(3),
    "status" "AssignmentStatus" NOT NULL DEFAULT 'SCHEDULED',

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_progress" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "benchmark_id" TEXT NOT NULL,
    "status" "StudentProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "mastery_score" DOUBLE PRECISION,
    "mastered_at" TIMESTAMP(3),
    "current_step_id" TEXT,
    "attempts_count" INTEGER NOT NULL DEFAULT 0,
    "off_ramp_triggered_at" TIMESTAMP(3),

    CONSTRAINT "student_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_attempts" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "score" DOUBLE PRECISION,
    "passed" BOOLEAN,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),

    CONSTRAINT "assessment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt_responses" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "response_json" JSONB NOT NULL,
    "selected_option_id" TEXT,
    "is_correct" BOOLEAN NOT NULL,
    "points_awarded" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidence" INTEGER,
    "time_seconds" INTEGER,

    CONSTRAINT "attempt_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remediation_items" (
    "id" TEXT NOT NULL,
    "benchmark_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "remediation_type" "RemediationType" NOT NULL,
    "skill_tag" TEXT NOT NULL,
    "misconception_id" TEXT,
    "content" TEXT NOT NULL,
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "remediation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_remediations" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "benchmark_id" TEXT NOT NULL,
    "remediation_item_id" TEXT NOT NULL,
    "status" "RemediationStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "student_remediations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spaced_review_state" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "benchmark_id" TEXT NOT NULL,
    "repetition_count" INTEGER NOT NULL DEFAULT 0,
    "easiness_factor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval_days" INTEGER NOT NULL DEFAULT 1,
    "due_at" TIMESTAMP(3) NOT NULL,
    "last_reviewed_at" TIMESTAMP(3),
    "last_quality" INTEGER,

    CONSTRAINT "spaced_review_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spaced_review_events" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "benchmark_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "quality" INTEGER NOT NULL,
    "confidence" INTEGER,
    "is_correct" BOOLEAN NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spaced_review_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "confidence_calibration_snapshots" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "snapshot_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "high_confidence_correct" INTEGER NOT NULL DEFAULT 0,
    "high_confidence_incorrect" INTEGER NOT NULL DEFAULT 0,
    "medium_confidence_correct" INTEGER NOT NULL DEFAULT 0,
    "medium_confidence_incorrect" INTEGER NOT NULL DEFAULT 0,
    "low_confidence_correct" INTEGER NOT NULL DEFAULT 0,
    "low_confidence_incorrect" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "confidence_calibration_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_decoder_progress" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "source_decoder_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_track_progress" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "mission_code" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "strategy_track_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon_key" TEXT NOT NULL,
    "criteria_json" JSONB NOT NULL,
    "track" "BadgeTrack" NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_badges" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "badge_id" TEXT NOT NULL,
    "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eoc_readiness_snapshots" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "reporting_category_id" TEXT NOT NULL,
    "readiness_score" DOUBLE PRECISION NOT NULL,
    "readiness_low" DOUBLE PRECISION NOT NULL,
    "readiness_high" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eoc_readiness_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_readiness_snapshots" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "reporting_category_id" TEXT NOT NULL,
    "readiness_score" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_readiness_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eoc_actual_scores" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "school_year" TEXT NOT NULL,
    "scaled_score" DOUBLE PRECISION,
    "achievement_level" INTEGER,
    "entered_by" TEXT NOT NULL,
    "entered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consent_acknowledged" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "eoc_actual_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eoc_calibration_runs" (
    "id" TEXT NOT NULL,
    "school_year" TEXT NOT NULL,
    "correlation_readiness_to_scaled" DOUBLE PRECISION,
    "correlation_by_reporting_category" JSONB,
    "correlation_by_stimulus_type" JSONB,
    "correlation_by_complexity" JSONB,
    "correlation_by_reading_load" JSONB,
    "correlation_by_confidence_calibration" JSONB,
    "recommended_weight_changes" JSONB,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "run_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eoc_calibration_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accommodations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "accommodations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_accommodations" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "accommodation_id" TEXT NOT NULL,
    "granted_by" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "student_accommodations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_overrides" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "benchmark_id" TEXT,
    "action" "TeacherOverrideAction" NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clever_id_key" ON "users"("clever_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "students_user_id_key" ON "students"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_district_student_id_key" ON "students"("district_student_id");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_user_id_key" ON "teachers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "parents_user_id_key" ON "parents"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "parent_student_links_parent_id_student_id_key" ON "parent_student_links"("parent_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_enrollments_class_id_student_id_key" ON "class_enrollments"("class_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "reporting_categories_name_key" ON "reporting_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "benchmarks_code_key" ON "benchmarks"("code");

-- CreateIndex
CREATE UNIQUE INDEX "benchmark_connections_benchmark_id_connected_benchmark_id_key" ON "benchmark_connections"("benchmark_id", "connected_benchmark_id");

-- CreateIndex
CREATE UNIQUE INDEX "term_translations_term_id_language_code_key" ON "term_translations"("term_id", "language_code");

-- CreateIndex
CREATE UNIQUE INDEX "stimulus_variants_stimulus_id_reading_load_level_key" ON "stimulus_variants"("stimulus_id", "reading_load_level");

-- CreateIndex
CREATE UNIQUE INDEX "questions_external_key_key" ON "questions"("external_key");

-- CreateIndex
CREATE INDEX "questions_benchmark_id_idx" ON "questions"("benchmark_id");

-- CreateIndex
CREATE UNIQUE INDEX "misconceptions_code_key" ON "misconceptions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_questions_assessment_id_question_id_key" ON "assessment_questions"("assessment_id", "question_id");

-- CreateIndex
CREATE INDEX "student_progress_student_id_benchmark_id_idx" ON "student_progress"("student_id", "benchmark_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_progress_student_id_benchmark_id_key" ON "student_progress"("student_id", "benchmark_id");

-- CreateIndex
CREATE INDEX "assessment_attempts_assessment_id_student_id_idx" ON "assessment_attempts"("assessment_id", "student_id");

-- CreateIndex
CREATE INDEX "spaced_review_state_student_id_benchmark_id_idx" ON "spaced_review_state"("student_id", "benchmark_id");

-- CreateIndex
CREATE INDEX "spaced_review_state_due_at_idx" ON "spaced_review_state"("due_at");

-- CreateIndex
CREATE UNIQUE INDEX "spaced_review_state_student_id_benchmark_id_key" ON "spaced_review_state"("student_id", "benchmark_id");

-- CreateIndex
CREATE UNIQUE INDEX "source_decoder_progress_student_id_level_key" ON "source_decoder_progress"("student_id", "level");

-- CreateIndex
CREATE UNIQUE INDEX "strategy_track_progress_student_id_mission_code_key" ON "strategy_track_progress"("student_id", "mission_code");

-- CreateIndex
CREATE UNIQUE INDEX "badges_name_key" ON "badges"("name");

-- CreateIndex
CREATE UNIQUE INDEX "student_badges_student_id_badge_id_key" ON "student_badges"("student_id", "badge_id");

-- CreateIndex
CREATE UNIQUE INDEX "eoc_actual_scores_student_id_school_year_key" ON "eoc_actual_scores"("student_id", "school_year");

-- CreateIndex
CREATE UNIQUE INDEX "accommodations_code_key" ON "accommodations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "student_accommodations_student_id_accommodation_id_key" ON "student_accommodations"("student_id", "accommodation_id");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parents" ADD CONSTRAINT "parents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_student_links" ADD CONSTRAINT "parent_student_links_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_student_links" ADD CONSTRAINT "parent_student_links_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmarks" ADD CONSTRAINT "benchmarks_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmarks" ADD CONSTRAINT "benchmarks_reporting_category_id_fkey" FOREIGN KEY ("reporting_category_id") REFERENCES "reporting_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_clarifications" ADD CONSTRAINT "benchmark_clarifications_benchmark_id_fkey" FOREIGN KEY ("benchmark_id") REFERENCES "benchmarks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_connections" ADD CONSTRAINT "benchmark_connections_benchmark_id_fkey" FOREIGN KEY ("benchmark_id") REFERENCES "benchmarks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_connections" ADD CONSTRAINT "benchmark_connections_connected_benchmark_id_fkey" FOREIGN KEY ("connected_benchmark_id") REFERENCES "benchmarks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms" ADD CONSTRAINT "terms_benchmark_id_fkey" FOREIGN KEY ("benchmark_id") REFERENCES "benchmarks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_translations" ADD CONSTRAINT "term_translations_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_benchmark_id_fkey" FOREIGN KEY ("benchmark_id") REFERENCES "benchmarks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_benchmark_id_fkey" FOREIGN KEY ("benchmark_id") REFERENCES "benchmarks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_steps" ADD CONSTRAINT "lesson_steps_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stimulus_variants" ADD CONSTRAINT "stimulus_variants_stimulus_id_fkey" FOREIGN KEY ("stimulus_id") REFERENCES "stimuli"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_benchmark_id_fkey" FOREIGN KEY ("benchmark_id") REFERENCES "benchmarks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_reporting_category_id_fkey" FOREIGN KEY ("reporting_category_id") REFERENCES "reporting_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_stimulus_id_fkey" FOREIGN KEY ("stimulus_id") REFERENCES "stimuli"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_misconception_id_fkey" FOREIGN KEY ("misconception_id") REFERENCES "misconceptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_misconception_id_fkey" FOREIGN KEY ("misconception_id") REFERENCES "misconceptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misconceptions" ADD CONSTRAINT "misconceptions_reporting_category_id_fkey" FOREIGN KEY ("reporting_category_id") REFERENCES "reporting_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "misconceptions" ADD CONSTRAINT "misconceptions_fix_remediation_id_fkey" FOREIGN KEY ("fix_remediation_id") REFERENCES "remediation_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_benchmark_id_fkey" FOREIGN KEY ("benchmark_id") REFERENCES "benchmarks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_benchmark_id_fkey" FOREIGN KEY ("benchmark_id") REFERENCES "benchmarks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_benchmark_id_fkey" FOREIGN KEY ("benchmark_id") REFERENCES "benchmarks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_current_step_id_fkey" FOREIGN KEY ("current_step_id") REFERENCES "lesson_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_responses" ADD CONSTRAINT "attempt_responses_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "assessment_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_responses" ADD CONSTRAINT "attempt_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_responses" ADD CONSTRAINT "attempt_responses_selected_option_id_fkey" FOREIGN KEY ("selected_option_id") REFERENCES "question_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remediation_items" ADD CONSTRAINT "remediation_items_benchmark_id_fkey" FOREIGN KEY ("benchmark_id") REFERENCES "benchmarks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remediation_items" ADD CONSTRAINT "remediation_items_misconception_id_fkey" FOREIGN KEY ("misconception_id") REFERENCES "misconceptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_remediations" ADD CONSTRAINT "student_remediations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_remediations" ADD CONSTRAINT "student_remediations_remediation_item_id_fkey" FOREIGN KEY ("remediation_item_id") REFERENCES "remediation_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spaced_review_state" ADD CONSTRAINT "spaced_review_state_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spaced_review_state" ADD CONSTRAINT "spaced_review_state_benchmark_id_fkey" FOREIGN KEY ("benchmark_id") REFERENCES "benchmarks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spaced_review_events" ADD CONSTRAINT "spaced_review_events_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spaced_review_events" ADD CONSTRAINT "spaced_review_events_benchmark_id_fkey" FOREIGN KEY ("benchmark_id") REFERENCES "benchmarks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spaced_review_events" ADD CONSTRAINT "spaced_review_events_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "confidence_calibration_snapshots" ADD CONSTRAINT "confidence_calibration_snapshots_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_decoder_progress" ADD CONSTRAINT "source_decoder_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_track_progress" ADD CONSTRAINT "strategy_track_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_badges" ADD CONSTRAINT "student_badges_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_badges" ADD CONSTRAINT "student_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eoc_readiness_snapshots" ADD CONSTRAINT "eoc_readiness_snapshots_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eoc_readiness_snapshots" ADD CONSTRAINT "eoc_readiness_snapshots_reporting_category_id_fkey" FOREIGN KEY ("reporting_category_id") REFERENCES "reporting_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_readiness_snapshots" ADD CONSTRAINT "class_readiness_snapshots_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_readiness_snapshots" ADD CONSTRAINT "class_readiness_snapshots_reporting_category_id_fkey" FOREIGN KEY ("reporting_category_id") REFERENCES "reporting_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eoc_actual_scores" ADD CONSTRAINT "eoc_actual_scores_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_accommodations" ADD CONSTRAINT "student_accommodations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_accommodations" ADD CONSTRAINT "student_accommodations_accommodation_id_fkey" FOREIGN KEY ("accommodation_id") REFERENCES "accommodations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_overrides" ADD CONSTRAINT "teacher_overrides_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_overrides" ADD CONSTRAINT "teacher_overrides_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
