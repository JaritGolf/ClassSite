/**
 * Readiness token — stateless replacement for the old server-side
 * "has this student passed the Readiness Check?" lookup.
 *
 * When a Readiness Check is graded as passed, the server hands back a token
 * signed over the benchmark code and the date. The device keeps it and
 * presents it to start (and submit) that benchmark's Mastery Challenge. The
 * server checks the signature and stores nothing.
 *
 * It names a benchmark, not a person, so it can be shared between students —
 * the same honest limit as a completion code. What it does guarantee is that
 * the Mastery Challenge questions are not served to someone who simply typed
 * the URL.
 */

import { isValidDateStamp, schoolDateStamp, signMessage, signaturesMatch } from './signing'

const PREFIX = 'R1'
const SIG_LENGTH = 16
const BENCHMARK_CODE = /^[A-Z0-9.]{3,30}$/

function message(benchmarkCode: string, dateStamp: string): string {
  return `readiness|v1|${benchmarkCode}|${dateStamp}`
}

export function issueReadinessToken(
  benchmarkCode: string,
  now: Date = new Date(),
  env: Record<string, string | undefined> = process.env
): string {
  const date = schoolDateStamp(now)
  return `${PREFIX}~${benchmarkCode}~${date}~${signMessage(message(benchmarkCode, date), SIG_LENGTH, env)}`
}

/** True only for an untampered token issued for exactly this benchmark. */
export function verifyReadinessToken(
  token: string | null | undefined,
  benchmarkCode: string,
  env: Record<string, string | undefined> = process.env
): boolean {
  if (!token || token.length > 120) return false
  const parts = token.split('~')
  if (parts.length !== 4) return false
  const [prefix, code, date, sig] = parts
  if (prefix !== PREFIX || code !== benchmarkCode) return false
  if (!BENCHMARK_CODE.test(code) || !isValidDateStamp(date)) return false
  try {
    return signaturesMatch(sig, signMessage(message(code, date), SIG_LENGTH, env))
  } catch {
    return false
  }
}
