/**
 * Seeded shuffle — deterministic Fisher-Yates keyed by a string seed.
 *
 * Used to randomize answer-option order at serve time. Every authored question
 * bank lists the correct option first, and options are stored/fetched in
 * authored order — without a shuffle the correct answer is always "A".
 *
 * Deterministic on purpose: the same seed (e.g. `${studentId}:${questionId}`)
 * always yields the same order, so a page refresh or React re-render never
 * reshuffles under the student, while different students (or attempts) see
 * different orders. Pure — no DB, safe for client or server.
 */

/** FNV-1a 32-bit string hash. */
function fnv1a(str: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** mulberry32 PRNG — small, fast, good distribution for this purpose. */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Return a new array with `items` in seeded-shuffled order.
 * Does not mutate the input. Same seed → same permutation.
 */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const result = items.slice()
  const rand = mulberry32(fnv1a(seed))
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
