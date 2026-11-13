/**
 * Completion codes.
 *
 * When a Mastery Challenge is passed, the server returns a short code the
 * student pastes into the Google Classroom assignment. The teacher pastes the
 * codes into the "Check codes" page, which confirms each one is genuine.
 *
 *   MCC-1.1-100-20260914-7K2M9XD4AQ
 *       │    │     │         └ signature (HMAC-SHA256 over the rest, SESSION_SECRET)
 *       │    │     └ date mastered (YYYYMMDD, US Eastern)
 *       │    └ score, percent
 *       └ benchmark (SS.7.CG.1.1)
 *
 * WHAT A CODE PROVES: that the Mastery Challenge for that benchmark was passed
 * with that score on that date, and that the code was not typed up by hand.
 *
 * WHAT IT DOES NOT PROVE: who earned it. There is no name, id or class in the
 * payload — by design, the server does not know who the student is. Two
 * students who master the same benchmark with the same score on the same day
 * get the same code, and a code can be copied from a friend. Google Classroom
 * (which the district already runs) is what ties a code to a student.
 *
 * The server stores no codes. Verifying is recomputing the signature.
 */

import { isValidDateStamp, schoolDateStamp, signMessage, signaturesMatch } from './signing'

const PREFIX = 'MCC'
const BENCHMARK_PREFIX = 'SS.7.CG.'
const SIG_LENGTH = 10

export interface CompletionPayload {
  /** Full benchmark code, e.g. "SS.7.CG.1.1". */
  benchmarkCode: string
  /** Whole-number percent, 0–100. */
  scorePercent: number
  /** YYYYMMDD. */
  dateStamp: string
}

function message(p: CompletionPayload): string {
  return `completion|v1|${p.benchmarkCode}|${p.scorePercent}|${p.dateStamp}`
}

function shortBenchmark(code: string): string | null {
  if (!code.startsWith(BENCHMARK_PREFIX)) return null
  const rest = code.slice(BENCHMARK_PREFIX.length)
  return /^\d{1,2}\.\d{1,2}$/.test(rest) ? rest : null
}

/**
 * Sign a completion code. Returns null for a benchmark code that cannot be
 * written in the short form (nothing outside SS.7.CG.x.y is ever issued).
 */
export function issueCompletionCode(
  input: { benchmarkCode: string; score: number; now?: Date },
  env: Record<string, string | undefined> = process.env
): string | null {
  const short = shortBenchmark(input.benchmarkCode)
  if (!short) return null
  const scorePercent = Math.max(0, Math.min(100, Math.round(input.score * 100)))
  const dateStamp = schoolDateStamp(input.now ?? new Date())
  const payload: CompletionPayload = { benchmarkCode: input.benchmarkCode, scorePercent, dateStamp }
  const sig = signMessage(message(payload), SIG_LENGTH, env)
  return `${PREFIX}-${short}-${scorePercent}-${dateStamp}-${sig}`
}

export type CodeCheck =
  | { valid: true; code: string; payload: CompletionPayload }
  | { valid: false; code: string; reason: 'malformed' | 'bad-signature' }

/** Tidy a pasted code: trim, upper-case, and undo Crockford look-alikes in the signature. */
export function normalizeCode(raw: string): string {
  const cleaned = raw.trim().toUpperCase()
  const lastDash = cleaned.lastIndexOf('-')
  if (lastDash === -1) return cleaned
  const sig = cleaned
    .slice(lastDash + 1)
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0')
  return `${cleaned.slice(0, lastDash)}-${sig}`
}

const CODE_PATTERN = /^MCC-(\d{1,2}\.\d{1,2})-(\d{1,3})-(\d{8})-([0-9A-HJKMNP-TV-Z]{10})$/

/**
 * Verify one code. Any change to the benchmark, score, date or signature —
 * even a single character — fails.
 */
export function verifyCompletionCode(
  raw: string,
  env: Record<string, string | undefined> = process.env
): CodeCheck {
  const code = normalizeCode(raw)
  const match = CODE_PATTERN.exec(code)
  if (!match) return { valid: false, code, reason: 'malformed' }

  const [, short, scoreText, dateStamp, sig] = match
  const scorePercent = Number(scoreText)
  // Reject non-canonical spellings ("080", a score over 100, an impossible date).
  if (String(scorePercent) !== scoreText || scorePercent > 100 || !isValidDateStamp(dateStamp)) {
    return { valid: false, code, reason: 'malformed' }
  }

  const payload: CompletionPayload = {
    benchmarkCode: `${BENCHMARK_PREFIX}${short}`,
    scorePercent,
    dateStamp,
  }

  let expected: string
  try {
    expected = signMessage(message(payload), SIG_LENGTH, env)
  } catch {
    return { valid: false, code, reason: 'bad-signature' }
  }
  return signaturesMatch(sig, expected)
    ? { valid: true, code, payload }
    : { valid: false, code, reason: 'bad-signature' }
}

/**
 * Pull completion codes out of pasted text. Runs IN THE TEACHER'S BROWSER, so
 * that whatever else was pasted alongside them — a student's name, a comment —
 * never leaves the page.
 */
export function extractCodes(text: string): string[] {
  const found = text.toUpperCase().match(/MCC-[0-9A-Z.]+(?:-[0-9A-Z]+){3}/g) ?? []
  return found.map(normalizeCode)
}

/** Shape a code must have to be accepted by the check endpoint at all. */
export const CODE_SHAPE = /^MCC-[0-9A-Z.]{1,8}-[0-9A-Z]{1,4}-[0-9A-Z]{1,10}-[0-9A-Z]{1,16}$/
