-- Nine-week progress checkpoints.
--
-- A teacher sets four checkpoints per school year (the nine-week grading
-- periods), each with an end date and up to four target missions. Reaching a
-- target earns that Level. Levels only describe progress — nothing gates content
-- on a date or a Level.
--
-- Config hangs off a teacher-owned plan rather than off Class, so one district
-- calendar is entered once and shared by every section; Class.progress_plan_id
-- lets a single section opt onto a different plan.

-- CreateTable
CREATE TABLE "progress_plans" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "school_year" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progress_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress_checkpoints" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "checkpoint_number" INTEGER NOT NULL,
    "ends_on" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progress_checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress_checkpoint_targets" (
    "id" TEXT NOT NULL,
    "checkpoint_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "benchmark_id" TEXT NOT NULL,

    CONSTRAINT "progress_checkpoint_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_checkpoint_levels" (
    "id" TEXT NOT NULL,
    "checkpoint_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "missions_cleared" INTEGER NOT NULL,
    "targets_json" JSONB NOT NULL,
    "locked_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_checkpoint_levels_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "classes" ADD COLUMN "progress_plan_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "progress_plans_teacher_id_school_year_key" ON "progress_plans"("teacher_id", "school_year");

-- CreateIndex
CREATE UNIQUE INDEX "progress_checkpoints_plan_id_checkpoint_number_key" ON "progress_checkpoints"("plan_id", "checkpoint_number");

-- CreateIndex
CREATE UNIQUE INDEX "progress_checkpoint_targets_checkpoint_id_level_key" ON "progress_checkpoint_targets"("checkpoint_id", "level");

-- CreateIndex
CREATE UNIQUE INDEX "student_checkpoint_levels_checkpoint_id_student_id_key" ON "student_checkpoint_levels"("checkpoint_id", "student_id");

-- CreateIndex
CREATE INDEX "student_checkpoint_levels_student_id_idx" ON "student_checkpoint_levels"("student_id");

-- AddForeignKey
ALTER TABLE "progress_plans" ADD CONSTRAINT "progress_plans_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_checkpoints" ADD CONSTRAINT "progress_checkpoints_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "progress_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_checkpoint_targets" ADD CONSTRAINT "progress_checkpoint_targets_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "progress_checkpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_checkpoint_targets" ADD CONSTRAINT "progress_checkpoint_targets_benchmark_id_fkey" FOREIGN KEY ("benchmark_id") REFERENCES "benchmarks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_checkpoint_levels" ADD CONSTRAINT "student_checkpoint_levels_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "progress_checkpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_checkpoint_levels" ADD CONSTRAINT "student_checkpoint_levels_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_progress_plan_id_fkey" FOREIGN KEY ("progress_plan_id") REFERENCES "progress_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
