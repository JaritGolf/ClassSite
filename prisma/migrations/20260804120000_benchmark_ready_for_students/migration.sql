-- Per-benchmark "ready for students" flag.
--
-- WHY THIS EXISTS, given the content check already asks whether a benchmark has
-- an approved mastery form and an approved lesson:
--
-- Content in this course is seeded piecemeal ON PURPOSE — the build scope was
-- deliberately limited to validate the platform before authoring all 36
-- benchmarks. So "some content exists" is the NORMAL state, not a signal that a
-- mission is ready to put in front of a 12-year-old. Inferring readiness purely
-- from what rows happen to exist means a benchmark goes live the instant a draft
-- lesson is seeded, which is exactly the mis-fire this flag prevents.
--
-- The flag is an ADDITIONAL gate, never a replacement: a mission opens only when
-- the teacher has flipped this true AND the content check also passes.
ALTER TABLE "benchmarks"
  ADD COLUMN "ready_for_students" BOOLEAN NOT NULL DEFAULT false;

-- Backfill so this migration is not a regression. Defaulting every row to false
-- would black out the entire Mission Map on deploy, so every benchmark that
-- ALREADY passes the content check is turned on here. From this point forward
-- new benchmarks default to false and the teacher opts them in explicitly.
UPDATE "benchmarks" b
SET "ready_for_students" = true
WHERE EXISTS (
  SELECT 1
  FROM "assessments" a
  WHERE a."benchmark_id" = b."id"
    AND a."assessment_type" = 'MASTERY_CHALLENGE'
    AND a."approval_status" = 'APPROVED'
    AND EXISTS (
      SELECT 1 FROM "assessment_questions" aq WHERE aq."assessment_id" = a."id"
    )
)
AND EXISTS (
  SELECT 1
  FROM "lessons" l
  WHERE l."benchmark_id" = b."id"
    AND l."approval_status" = 'APPROVED'
);
