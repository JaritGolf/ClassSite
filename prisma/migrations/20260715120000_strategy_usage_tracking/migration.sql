-- Strategy Track: usage counting + configurable requirement + per-student override

-- AlterTable: class-wide required uses per strategy (0 = no requirement)
ALTER TABLE "classes" ADD COLUMN "strategy_uses_required" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: count of correct apply-it rounds ("uses")
ALTER TABLE "strategy_track_progress" ADD COLUMN "use_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: per-student override of the class-wide requirement for one strategy
CREATE TABLE "student_strategy_override" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "mission_code" TEXT NOT NULL,
    "required_uses" INTEGER,
    "waived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_strategy_override_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_strategy_override_student_id_mission_code_key" ON "student_strategy_override"("student_id", "mission_code");

-- AddForeignKey
ALTER TABLE "student_strategy_override" ADD CONSTRAINT "student_strategy_override_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
