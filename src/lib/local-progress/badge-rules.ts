/**
 * Which badge criteria can ever be met. Badges whose criteria have no data
 * source are hidden rather than shown as permanently locked.
 */

const UNSUPPORTED_EVENTS = new Set([
  'source_analysis_complete',
  'claim_identified',
  'source_decoder_purpose',
  'source_decoder_compare',
])

export function isCriteriaWinnable(criteria: unknown): boolean {
  const c = criteria as { event?: unknown; tags?: unknown[]; tag?: unknown } | null
  if (!c || typeof c.event !== 'string') return false
  if (UNSUPPORTED_EVENTS.has(c.event)) return false
  if (c.event === 'benchmark_mastered' && Array.isArray(c.tags) && c.tags.length > 0) return false
  if (c.event === 'mastery_score_above' && c.tag) return false
  return true
}
