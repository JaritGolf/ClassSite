/**
 * Authored remediation content registry (ADR 0013, spec §14).
 *
 * Each def is genuine reteach material for one (benchmark, skill_tag) pair:
 * a concept re-explanation, ≥2 examples + ≥2 non-examples with explanations,
 * and an optional try-it check. seed/remediation_items.ts merges this over its
 * DB-derived pair loop — authored content wins; unauthored pairs keep the
 * generated placeholder (NEEDS_REVIEW) so coverage never regresses.
 *
 * Shape is validated against RemediationContentSchema by
 * tests/unit/seed/remediation-content-shape.test.ts.
 */

import type { RemediationType } from '@prisma/client'
import type { RemediationContent } from '../../src/lib/lesson-content'
import { UNIT1_REMEDIATION } from './unit1'

export interface RemediationContentDef {
  benchmarkCode: string
  skillTag: string
  title: string
  remediationType: RemediationType
  content: RemediationContent
}

export function remediationKey(benchmarkCode: string, skillTag: string): string {
  return `${benchmarkCode}::${skillTag}`
}

export const ALL_AUTHORED_REMEDIATION: RemediationContentDef[] = [...UNIT1_REMEDIATION]

export const REMEDIATION_CONTENT: Map<string, RemediationContentDef> = new Map(
  ALL_AUTHORED_REMEDIATION.map((d) => [remediationKey(d.benchmarkCode, d.skillTag), d])
)
