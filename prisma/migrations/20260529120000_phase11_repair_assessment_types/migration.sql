-- Spec-gap repair: add assessment types that the spec defines but the enum was missing.
--   PRE_CHECK    — Mission Pre-Check / "Mission Scout" ungraded baseline (spec §10.4, §12.5)
--   VOCAB_CHECK  — Vocabulary mini-check / "Word Builder" (spec §12.5)
--   UNIT_REVIEW  — Unit review / "Region Challenge" (spec §12.5)
-- BEFORE clauses keep the DB enum order aligned with schema.prisma to avoid drift.

ALTER TYPE "AssessmentType" ADD VALUE IF NOT EXISTS 'PRE_CHECK' BEFORE 'READINESS_CHECK';
ALTER TYPE "AssessmentType" ADD VALUE IF NOT EXISTS 'VOCAB_CHECK' BEFORE 'READINESS_CHECK';
ALTER TYPE "AssessmentType" ADD VALUE IF NOT EXISTS 'UNIT_REVIEW' BEFORE 'REPUBLIC_CHALLENGE';
