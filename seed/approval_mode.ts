/**
 * Content approval mode for completed-unit instructional content (ADR 0013).
 *
 * Owner directive (2026-07-09): AI-drafted instructional content for units the
 * owner has commissioned and reviewed at the format level is seeded APPROVED
 * under the owner's explicit authority — the Tier D ("bulk approve by
 * tag/directive") trust path — instead of Tier C's NEEDS_REVIEW default, so a
 * completed unit is turnkey for students without a manual in-app approval
 * pass. The owner reviews content in /teacher/content afterward and archives
 * or marks NEEDS_REVISION anything that misses the bar.
 *
 * Applies to: Unit 1 lessons, the Unit 1 question backfill, Unit 1 authored
 * remediation content, and Spanish (es) term translations. AI drafts for
 * not-yet-completed units (e.g. seed/questions/unit2.ts) remain Tier C /
 * NEEDS_REVIEW until their unit is completed under this same directive.
 */

import type { ApprovalStatus, SourceTier } from '@prisma/client'

export const CONTENT_APPROVAL: {
  approvalStatus: ApprovalStatus
  sourceTier: SourceTier
} = {
  approvalStatus: 'APPROVED',
  sourceTier: 'D',
}
