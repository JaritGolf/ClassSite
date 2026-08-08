-- Records WHEN the district notified us that a student is no longer enrolled.
--
-- Fla. Stat. § 1006.1494(3)(c) requires an operator to delete a student's covered
-- information "at the conclusion of the course or corresponding program and no
-- later than 90 days after a student is no longer enrolled in a school within the
-- district, upon notice by the school district."
--
-- The statutory trigger is district notice, which the application cannot observe.
-- An administrator records it in this column and the retention purge computes the
-- 90-day deadline from it.
--
-- Additive and nullable. Existing rows get NULL, meaning "still enrolled, no
-- deletion clock running" — so this migration changes no behaviour on its own.

ALTER TABLE "students" ADD COLUMN "deactivated_at" TIMESTAMP(3);

-- The purge scans for students whose clock has expired. Indexed because that scan
-- runs across the whole table and is expected to match almost nothing.
CREATE INDEX "students_deactivated_at_idx" ON "students"("deactivated_at");
