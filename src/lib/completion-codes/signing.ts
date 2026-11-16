/**
 * HMAC signing shared by completion codes and readiness tokens.
 *
 * Both are short strings the SERVER signs and the STUDENT'S DEVICE holds. They
 * carry a benchmark, a result and a date — never a name, an id, a class or
 * anything else about who earned them. The server keeps no copy: verifying one
 * means recomputing the signature, not looking anything up.
 *
 * The key is SESSION_SECRET. If it is missing, signing and verifying both fail
 * closed rather than fall back to a guessable default.
 */

import { createHmac, timingSafeEqual } from 'crypto'

// Crockford base32: no I, L, O or U, so a hand-copied code has no look-alikes.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

export class SigningUnavailableError extends Error {
  constructor() {
    super('SESSION_SECRET is not set — codes cannot be signed or verified')
    this.name = 'SigningUnavailableError'
  }
}

function secret(env: Record<string, string | undefined> = process.env): string {
  const value = env.SESSION_SECRET
  if (!value || value.length < 16) throw new SigningUnavailableError()
  return value
}

/** First `length` base32 characters of HMAC-SHA256(secret, message). */
export function signMessage(
  message: string,
  length: number,
  env: Record<string, string | undefined> = process.env
): string {
  const digest = createHmac('sha256', secret(env)).update(message, 'utf8').digest()
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of digest) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5 && out.length < length) {
      out += ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
    if (out.length >= length) break
  }
  return out
}

/** Constant-time comparison of two signature strings. */
export function signaturesMatch(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

/** Today's date as YYYYMMDD in the school's time zone (US Eastern). */
export function schoolDateStamp(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}${get('month')}${get('day')}`
}

/** True for a real calendar date written YYYYMMDD. */
export function isValidDateStamp(stamp: string): boolean {
  if (!/^\d{8}$/.test(stamp)) return false
  const y = Number(stamp.slice(0, 4))
  const m = Number(stamp.slice(4, 6))
  const d = Number(stamp.slice(6, 8))
  if (y < 2020 || y > 2100) return false
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}
