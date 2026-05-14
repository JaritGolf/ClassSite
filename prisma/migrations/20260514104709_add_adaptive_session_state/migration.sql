-- CreateTable
CREATE TABLE "adaptive_session_states" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "current_complexity" "CognitiveComplexity" NOT NULL DEFAULT 'LOW',
    "consecutive_correct" INTEGER NOT NULL DEFAULT 0,
    "consecutive_incorrect" INTEGER NOT NULL DEFAULT 0,
    "pending_worked_example" BOOLEAN NOT NULL DEFAULT false,
    "pending_near_transfer" BOOLEAN NOT NULL DEFAULT false,
    "worked_example_question_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adaptive_session_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "adaptive_session_states_attempt_id_key" ON "adaptive_session_states"("attempt_id");

-- AddForeignKey
ALTER TABLE "adaptive_session_states" ADD CONSTRAINT "adaptive_session_states_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "assessment_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
