import { seededShuffle } from '@/lib/shuffle'

describe('seededShuffle', () => {
  const items = ['correct', 'b', 'c', 'd']

  it('is deterministic — same seed yields the same order every time', () => {
    const a = seededShuffle(items, 'student-1:question-1')
    const b = seededShuffle(items, 'student-1:question-1')
    expect(a).toEqual(b)
  })

  it('returns a valid permutation and does not mutate the input', () => {
    const input = ['w', 'x', 'y', 'z']
    const frozen = [...input]
    const out = seededShuffle(input, 'any-seed')
    expect(input).toEqual(frozen)
    expect([...out].sort()).toEqual([...input].sort())
    expect(out).toHaveLength(input.length)
  })

  it('different seeds produce different orders (across a sample)', () => {
    const orders = new Set<string>()
    for (let i = 0; i < 50; i++) {
      orders.add(seededShuffle(items, `seed-${i}`).join(','))
    }
    // 4 items have 24 permutations; 50 seeds must hit well more than one.
    expect(orders.size).toBeGreaterThan(5)
  })

  it('a correct-first input lands in EVERY slot across many seeds (the always-A bug)', () => {
    const positions = new Set<number>()
    for (let i = 0; i < 200; i++) {
      const out = seededShuffle(items, `student-${i}:q-1`)
      positions.add(out.indexOf('correct'))
    }
    expect(positions).toEqual(new Set([0, 1, 2, 3]))
  })

  it('distribution is roughly uniform — no slot hoards the correct answer', () => {
    const counts = [0, 0, 0, 0]
    const n = 2000
    for (let i = 0; i < n; i++) {
      counts[seededShuffle(items, `s${i}`).indexOf('correct')]++
    }
    for (const c of counts) {
      // Expected 500 per slot; allow generous ±40% band.
      expect(c).toBeGreaterThan(n * 0.15)
      expect(c).toBeLessThan(n * 0.35)
    }
  })

  it('handles empty and single-item arrays', () => {
    expect(seededShuffle([], 'x')).toEqual([])
    expect(seededShuffle(['only'], 'x')).toEqual(['only'])
  })
})
