-- Suggestion Box (ADR 0021): comment vs. question, chosen by the author via a toggle
-- in the box. Additive — existing rows default to COMMENT.

-- CreateEnum
CREATE TYPE "SuggestionKind" AS ENUM ('COMMENT', 'QUESTION');

-- AlterTable
ALTER TABLE "suggestions"
  ADD COLUMN IF NOT EXISTS "kind" "SuggestionKind" NOT NULL DEFAULT 'COMMENT';

-- CreateIndex: the admin queue reads audience + kind + status, newest first
CREATE INDEX "suggestions_audience_kind_status_created_at_idx" ON "suggestions"("audience", "kind", "status", "created_at");
