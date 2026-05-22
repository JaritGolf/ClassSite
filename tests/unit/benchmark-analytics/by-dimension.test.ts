/**
 * Unit Tests: Benchmark Analytics — by-dimension bucketing logic
 *
 * Tests pure bucketing logic for reading-load level, complexity, and stimulus type.
 * Uses pure functions without DB calls.
 */

// ── Pure helpers that mirror the production bucketing logic ───────────────────

interface MockResponse {
  isCorrect: boolean
  readingLoadLevel?: number
  cognitiveComplexity?: string
  stimulusType?: string | null
}

function bucketByReadingLoad(
  responses: MockResponse[]
): Array<{ key: '1' | '2' | '3'; correctRate: number; sampleSize: number }> {
  const byLevel = new Map<number, { correct: number; total: number }>()
  for (const r of responses) {
    if (r.readingLoadLevel == null) continue
    const entry = byLevel.get(r.readingLoadLevel) ?? { correct: 0, total: 0 }
    entry.total++
    if (r.isCorrect) entry.correct++
    byLevel.set(r.readingLoadLevel, entry)
  }

  return ([1, 2, 3] as const).map((level) => {
    const agg = byLevel.get(level) ?? { correct: 0, total: 0 }
    return {
      key: String(level) as '1' | '2' | '3',
      correctRate: agg.total === 0 ? 0 : Math.round((agg.correct / agg.total) * 1000) / 10,
      sampleSize: agg.total,
    }
  })
}

function bucketByComplexity(
  responses: MockResponse[]
): Array<{ key: 'LOW' | 'MODERATE' | 'HIGH'; correctRate: number; sampleSize: number }> {
  const byComplexity = new Map<string, { correct: number; total: number }>()
  for (const r of responses) {
    if (!r.cognitiveComplexity) continue
    const key = r.cognitiveComplexity
    const entry = byComplexity.get(key) ?? { correct: 0, total: 0 }
    entry.total++
    if (r.isCorrect) entry.correct++
    byComplexity.set(key, entry)
  }

  return (['LOW', 'MODERATE', 'HIGH'] as const).map((level) => {
    const agg = byComplexity.get(level) ?? { correct: 0, total: 0 }
    return {
      key: level,
      correctRate: agg.total === 0 ? 0 : Math.round((agg.correct / agg.total) * 1000) / 10,
      sampleSize: agg.total,
    }
  })
}

function bucketByStimulusType(
  responses: MockResponse[]
): Array<{ key: string; correctRate: number; sampleSize: number }> {
  const byStimulusType = new Map<string, { correct: number; total: number }>()
  for (const r of responses) {
    const key = r.stimulusType ?? 'NONE'
    const entry = byStimulusType.get(key) ?? { correct: 0, total: 0 }
    entry.total++
    if (r.isCorrect) entry.correct++
    byStimulusType.set(key, entry)
  }

  return Array.from(byStimulusType.entries()).map(([key, agg]) => ({
    key,
    correctRate: agg.total === 0 ? 0 : Math.round((agg.correct / agg.total) * 1000) / 10,
    sampleSize: agg.total,
  }))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('bucketByReadingLoad', () => {
  it('correctly buckets correct rate per level', () => {
    const responses: MockResponse[] = [
      { isCorrect: true, readingLoadLevel: 1 },
      { isCorrect: false, readingLoadLevel: 1 },
      { isCorrect: true, readingLoadLevel: 2 },
      { isCorrect: true, readingLoadLevel: 2 },
      { isCorrect: false, readingLoadLevel: 3 },
    ]

    const result = bucketByReadingLoad(responses)

    const l1 = result.find((r) => r.key === '1')!
    expect(l1.sampleSize).toBe(2)
    expect(l1.correctRate).toBe(50)

    const l2 = result.find((r) => r.key === '2')!
    expect(l2.sampleSize).toBe(2)
    expect(l2.correctRate).toBe(100)

    const l3 = result.find((r) => r.key === '3')!
    expect(l3.sampleSize).toBe(1)
    expect(l3.correctRate).toBe(0)
  })

  it('returns 0 correctRate and 0 sampleSize for levels with no responses', () => {
    const responses: MockResponse[] = [{ isCorrect: true, readingLoadLevel: 2 }]
    const result = bucketByReadingLoad(responses)
    const l1 = result.find((r) => r.key === '1')!
    expect(l1.sampleSize).toBe(0)
    expect(l1.correctRate).toBe(0)
  })

  it('returns all three levels even when all responses are at one level', () => {
    const responses: MockResponse[] = [
      { isCorrect: true, readingLoadLevel: 1 },
      { isCorrect: true, readingLoadLevel: 1 },
    ]
    const result = bucketByReadingLoad(responses)
    expect(result).toHaveLength(3)
    expect(result.map((r) => r.key)).toEqual(['1', '2', '3'])
  })

  it('returns empty buckets (sampleSize=0) when no responses provided', () => {
    const result = bucketByReadingLoad([])
    expect(result).toHaveLength(3)
    for (const r of result) {
      expect(r.sampleSize).toBe(0)
      expect(r.correctRate).toBe(0)
    }
  })
})

describe('bucketByComplexity', () => {
  it('correctly buckets correct rate per complexity', () => {
    const responses: MockResponse[] = [
      { isCorrect: true, cognitiveComplexity: 'LOW' },
      { isCorrect: true, cognitiveComplexity: 'LOW' },
      { isCorrect: false, cognitiveComplexity: 'MODERATE' },
      { isCorrect: true, cognitiveComplexity: 'HIGH' },
    ]

    const result = bucketByComplexity(responses)
    const low = result.find((r) => r.key === 'LOW')!
    expect(low.sampleSize).toBe(2)
    expect(low.correctRate).toBe(100)

    const mod = result.find((r) => r.key === 'MODERATE')!
    expect(mod.sampleSize).toBe(1)
    expect(mod.correctRate).toBe(0)

    const high = result.find((r) => r.key === 'HIGH')!
    expect(high.sampleSize).toBe(1)
    expect(high.correctRate).toBe(100)
  })

  it('always returns LOW, MODERATE, HIGH even with empty data', () => {
    const result = bucketByComplexity([])
    expect(result.map((r) => r.key)).toEqual(['LOW', 'MODERATE', 'HIGH'])
  })
})

describe('bucketByStimulusType', () => {
  it('groups NONE when no stimulus present', () => {
    const responses: MockResponse[] = [
      { isCorrect: true, stimulusType: null },
      { isCorrect: false, stimulusType: null },
    ]
    const result = bucketByStimulusType(responses)
    const none = result.find((r) => r.key === 'NONE')!
    expect(none.sampleSize).toBe(2)
    expect(none.correctRate).toBe(50)
  })

  it('separates different stimulus types into separate rows', () => {
    const responses: MockResponse[] = [
      { isCorrect: true, stimulusType: 'TEXT_EXCERPT' },
      { isCorrect: false, stimulusType: 'POLITICAL_CARTOON' },
    ]
    const result = bucketByStimulusType(responses)
    expect(result).toHaveLength(2)
    const types = result.map((r) => r.key)
    expect(types).toContain('TEXT_EXCERPT')
    expect(types).toContain('POLITICAL_CARTOON')
  })

  it('returns empty array when no responses', () => {
    const result = bucketByStimulusType([])
    expect(result).toHaveLength(0)
  })
})
