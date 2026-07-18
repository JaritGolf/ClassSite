-- CreateEnum
CREATE TYPE "LessonStepSource" AS ENUM ('SEED', 'ADMIN');

-- AlterTable
ALTER TABLE "class_lesson_step_visibility" ADD COLUMN     "override_content" TEXT,
ADD COLUMN     "override_title" TEXT,
ALTER COLUMN "visible" DROP NOT NULL;

-- AlterTable
ALTER TABLE "lesson_steps" ADD COLUMN     "content_edited_at" TIMESTAMP(3),
ADD COLUMN     "source" "LessonStepSource" NOT NULL DEFAULT 'SEED';

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "structure_edited_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "uploaded_lesson_images" (
    "id" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uploaded_lesson_images_pkey" PRIMARY KEY ("id")
);
