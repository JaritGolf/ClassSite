-- Phase 8b: add skip_all_npcs column to narrative_progress

ALTER TABLE "narrative_progress" ADD COLUMN "skip_all_npcs" BOOLEAN NOT NULL DEFAULT false;
