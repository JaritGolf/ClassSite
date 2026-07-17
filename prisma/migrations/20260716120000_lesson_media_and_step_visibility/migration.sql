-- Lesson rich media (ADR 0015): media step types + teacher visibility controls

-- AlterEnum: dedicated step types for structured media content
ALTER TYPE "LessonStepType" ADD VALUE 'IMAGE';
ALTER TYPE "LessonStepType" ADD VALUE 'DIAGRAM';
ALTER TYPE "LessonStepType" ADD VALUE 'INFOGRAPHIC';

-- AlterTable: global teacher kill-switch for media steps
ALTER TABLE "lesson_steps" ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable: per-class tri-state visibility override (row absent = inherit global)
CREATE TABLE "class_lesson_step_visibility" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "lesson_step_id" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_lesson_step_visibility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "class_lesson_step_visibility_class_id_lesson_step_id_key" ON "class_lesson_step_visibility"("class_id", "lesson_step_id");

-- AddForeignKey
ALTER TABLE "class_lesson_step_visibility" ADD CONSTRAINT "class_lesson_step_visibility_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: cascade — an override is meaningless once its step is deleted
ALTER TABLE "class_lesson_step_visibility" ADD CONSTRAINT "class_lesson_step_visibility_lesson_step_id_fkey" FOREIGN KEY ("lesson_step_id") REFERENCES "lesson_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
