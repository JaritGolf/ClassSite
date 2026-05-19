-- Phase 8: streak states, narrative progress, and student UI settings tables

CREATE TABLE "streak_states" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "current_length" INTEGER NOT NULL DEFAULT 0,
    "longest_length" INTEGER NOT NULL DEFAULT 0,
    "last_active_date" DATE,
    "freeze_tokens" INTEGER NOT NULL DEFAULT 2,
    "freeze_tokens_granted_week" TEXT,

    CONSTRAINT "streak_states_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "narrative_progress" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "beats_read_json" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "narrative_progress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_ui_settings" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "pause_point_minutes" INTEGER NOT NULL DEFAULT 40,
    "reduce_motion" BOOLEAN NOT NULL DEFAULT false,
    "skip_all_npcs" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "student_ui_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "streak_states_student_id_key" ON "streak_states"("student_id");
CREATE UNIQUE INDEX "narrative_progress_student_id_unit_id_key" ON "narrative_progress"("student_id", "unit_id");
CREATE UNIQUE INDEX "student_ui_settings_student_id_key" ON "student_ui_settings"("student_id");

ALTER TABLE "streak_states" ADD CONSTRAINT "streak_states_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "narrative_progress" ADD CONSTRAINT "narrative_progress_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "narrative_progress" ADD CONSTRAINT "narrative_progress_unit_id_fkey"
    FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "student_ui_settings" ADD CONSTRAINT "student_ui_settings_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
