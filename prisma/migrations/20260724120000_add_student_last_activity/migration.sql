-- Dashboard "pick up where you left off": tracks the single most recent
-- activity per student across mission/drill/republic-challenge/strategy/
-- source-decoder/remediation surfaces.

-- CreateEnum
CREATE TYPE "StudentActivityType" AS ENUM ('MISSION_TRAINING', 'ASSESSMENT', 'DAILY_DRILL', 'STRATEGY_TRACK', 'SOURCE_DECODER', 'REMEDIATION');

-- CreateTable
CREATE TABLE "student_last_activity" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "activity_type" "StudentActivityType" NOT NULL,
    "reference_id" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_last_activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_last_activity_student_id_key" ON "student_last_activity"("student_id");

-- AddForeignKey
ALTER TABLE "student_last_activity" ADD CONSTRAINT "student_last_activity_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
