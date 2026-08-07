-- Class-scoped lesson module authoring (ADR 0023).
--
-- ADDITIVE ONLY: two new tables and one new enum. No existing table is
-- altered, no data is backfilled, and no column changes nullability — so this
-- migration is a no-op for every existing class, and rolling forward cannot
-- change what any student currently sees.
--
-- Neither table is touched by any seed stage, so both are reseed-safe by
-- construction (the same property ClassLessonStepVisibility already has). No
-- structureEditedAt-style guard is required.

-- CreateEnum
CREATE TYPE "ClassStepAnchor" AS ENUM ('BEFORE', 'AFTER');

-- CreateTable: a lesson module a teacher authored for ONE of their classes.
CREATE TABLE "class_lesson_steps" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "sibling_group_id" TEXT NOT NULL,
    "step_type" "LessonStepType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "anchor_lesson_step_id" TEXT,
    "anchor_position" "ClassStepAnchor" NOT NULL DEFAULT 'AFTER',
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_lesson_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable: one row per (class, lesson) holding that class's module order.
-- An ABSENT row means "no ordering opinion" — the class sees the pristine
-- built-in sequence.
CREATE TABLE "class_lesson_outlines" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "ordered_item_ids" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_lesson_outlines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_lesson_steps_class_id_lesson_id_created_at_idx" ON "class_lesson_steps"("class_id", "lesson_id", "created_at");

-- CreateIndex
CREATE INDEX "class_lesson_steps_sibling_group_id_idx" ON "class_lesson_steps"("sibling_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_lesson_outlines_class_id_lesson_id_key" ON "class_lesson_outlines"("class_id", "lesson_id");

-- AddForeignKey
-- RESTRICT on class: classes are archived (active=false), never deleted, and
-- this matches ClassLessonStepVisibility.class_id.
ALTER TABLE "class_lesson_steps" ADD CONSTRAINT "class_lesson_steps_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- CASCADE on lesson: a teacher module for a deleted lesson is meaningless.
ALTER TABLE "class_lesson_steps" ADD CONSTRAINT "class_lesson_steps_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
-- SET NULL on the anchor, deliberately NOT CASCADE: the seeder's
-- deleteMany({ lessonId, id: { notIn: keptIds } }) pass drops built-in steps
-- that left their seed def, and it must never take a teacher's own module with
-- it. The module survives, loses only its reconstruction hint, and keeps its
-- real position in class_lesson_outlines.
ALTER TABLE "class_lesson_steps" ADD CONSTRAINT "class_lesson_steps_anchor_lesson_step_id_fkey" FOREIGN KEY ("anchor_lesson_step_id") REFERENCES "lesson_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_lesson_outlines" ADD CONSTRAINT "class_lesson_outlines_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_lesson_outlines" ADD CONSTRAINT "class_lesson_outlines_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
