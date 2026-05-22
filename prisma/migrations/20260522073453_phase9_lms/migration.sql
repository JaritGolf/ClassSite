-- Phase 9 LMS: Class.subPrepNotes + AssessmentAttempt.voided

ALTER TABLE classes ADD COLUMN sub_prep_notes TEXT;
ALTER TABLE assessment_attempts ADD COLUMN voided BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX idx_assessment_attempts_student_voided
  ON assessment_attempts (student_id, voided);
