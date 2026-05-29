/**
 * Question Tag Validation — Pure Functions (spec §11, §13.3; non-negotiable rule #3).
 *
 * "Every question must be fully tagged. Untagged content does not ship."
 * This enforces the required-tag contract programmatically so the question bank
 * and seed authoring can surface gaps instead of relying on discipline alone.
 *
 * No database calls — operates on a plain question shape.
 */

export interface ValidatableQuestion {
  benchmarkId: string | null
  reportingCategoryId: string | null
  cognitiveComplexity: string | null
  stimulusType?: string | null
  /** Required when the question references a stimulus */
  stimulusId?: string | null
  readingLoadLevel: number | null
  skillTag: string | null
  remediationTag: string | null
  misconceptionId?: string | null
  sourceTier: string | null
  approvalStatus: string | null
}

/** A required tag and whether it is satisfied for a given question. */
const REQUIRED_STRING_FIELDS: Array<keyof ValidatableQuestion> = [
  'benchmarkId',
  'reportingCategoryId',
  'cognitiveComplexity',
  'skillTag',
  'remediationTag',
  'sourceTier',
  'approvalStatus',
]

/**
 * Return the list of missing/invalid required tags for a question.
 * An empty array means the question is fully tagged.
 *
 * Rules:
 *  - All REQUIRED_STRING_FIELDS must be non-empty.
 *  - readingLoadLevel must be 1, 2, or 3.
 *  - If a stimulusId is present, stimulusType must also be present (the item
 *    references a stimulus, so its type must be tagged for EOC alignment).
 */
export function validateQuestionTags(q: ValidatableQuestion): string[] {
  const missing: string[] = []

  for (const field of REQUIRED_STRING_FIELDS) {
    const value = q[field]
    if (value === null || value === undefined || String(value).trim() === '') {
      missing.push(field)
    }
  }

  if (q.readingLoadLevel === null || q.readingLoadLevel === undefined) {
    missing.push('readingLoadLevel')
  } else if (![1, 2, 3].includes(q.readingLoadLevel)) {
    missing.push('readingLoadLevel')
  }

  if (q.stimulusId && !(q.stimulusType && String(q.stimulusType).trim() !== '')) {
    missing.push('stimulusType')
  }

  return missing
}

/** Convenience predicate. */
export function isFullyTagged(q: ValidatableQuestion): boolean {
  return validateQuestionTags(q).length === 0
}
