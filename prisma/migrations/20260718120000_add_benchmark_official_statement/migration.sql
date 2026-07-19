-- Teacher benchmark description: persist the verbatim official Florida standard
-- statement (previously only in the checked-in seed/official_standards.ts
-- guardrail snapshot) so the teacher benchmark detail page can render it.
ALTER TABLE "benchmarks"
  ADD COLUMN IF NOT EXISTS "official_statement" TEXT;
