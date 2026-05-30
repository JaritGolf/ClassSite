-- Phase 12 accessibility: per-student high-contrast and large-text UI preferences.
ALTER TABLE "student_ui_settings"
  ADD COLUMN IF NOT EXISTS "high_contrast" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "large_text" BOOLEAN NOT NULL DEFAULT false;
