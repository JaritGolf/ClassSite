/**
 * Address predicates for the server-side image import (ADR 0023).
 *
 * When a teacher pastes a picture link, the SERVER fetches it once and
 * re-hosts it on our own domain. That is the only mechanism that works — the
 * CSP is `img-src 'self' data: blob:` and ImageSchema.asset only accepts
 * `svg:<key>` or `/media/<path>` — and it is also the right one, because a
 * hotlinked image would make every student's browser contact a third-party
 * server, handing it their IP addresses and reading times.
 *
 * But "the server fetches a URL the user supplied" is textbook SSRF. This file
 * is the entire bypass surface, deliberately isolated and PURE so jest can
 * cover every range without network or DNS infrastructure. It answers exactly
 * one question: may we open a connection to this resolved address?
 *
 * The rules are DENY-by-range, not allow-by-guess. Anything not provably
 * public is refused.
 */

/** Parse dotted-quad IPv4 into its four octets, or null if it isn't one. */
function parseIpv4(address: string): number[] | null {
  const parts = address.split('.')
  if (parts.length !== 4) return null
  const octets: number[] = []
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null
    const n = Number(part)
    if (n > 255) return null
    octets.push(n)
  }
  return octets
}

/**
 * Non-public IPv4 space.
 *
 * 169.254.0.0/16 is the one to notice: it contains 169.254.169.254, the cloud
 * instance-metadata endpoint that hands out credentials on most providers.
 */
function isBlockedIpv4(octets: number[]): boolean {
  const [a, b] = octets
  if (a === 0) return true // 0.0.0.0/8 "this network"
  if (a === 10) return true // RFC1918 private
  if (a === 127) return true // loopback
  if (a === 100 && b >= 64 && b <= 127) return true // 100.64/10 carrier NAT
  if (a === 169 && b === 254) return true // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true // RFC1918 private
  if (a === 192 && b === 0) return true // 192.0.0/24 + 192.0.2/24 TEST-NET-1
  if (a === 192 && b === 88) return true // 6to4 relay anycast
  if (a === 192 && b === 168) return true // RFC1918 private
  if (a === 198 && (b === 18 || b === 19)) return true // benchmarking
  if (a === 198 && b === 51) return true // TEST-NET-2
  if (a === 203 && b === 0) return true // TEST-NET-3
  if (a >= 224) return true // multicast, reserved, broadcast
  return false
}

/** Expand an IPv6 literal to its 8 groups, or null if it isn't one. */
function parseIpv6Groups(address: string): number[] | null {
  let text = address.trim().toLowerCase()
  if (text.startsWith('[') && text.endsWith(']')) text = text.slice(1, -1)
  // Strip a zone index (fe80::1%eth0) — it never makes an address more public.
  const zone = text.indexOf('%')
  if (zone !== -1) text = text.slice(0, zone)
  if (!text.includes(':')) return null

  // A trailing dotted-quad (::ffff:127.0.0.1) becomes two 16-bit groups.
  let tail: number[] = []
  const lastColon = text.lastIndexOf(':')
  const suffix = text.slice(lastColon + 1)
  if (suffix.includes('.')) {
    const v4 = parseIpv4(suffix)
    if (!v4) return null
    tail = [(v4[0] << 8) | v4[1], (v4[2] << 8) | v4[3]]
    text = text.slice(0, lastColon + 1)
    if (text.endsWith(':') && !text.endsWith('::')) text = text.slice(0, -1)
  }

  const doubleColon = text.indexOf('::')
  let head: number[]
  let rest: number[]
  const toGroups = (segment: string): number[] | null => {
    if (segment === '') return []
    const out: number[] = []
    for (const piece of segment.split(':')) {
      if (!/^[0-9a-f]{1,4}$/.test(piece)) return null
      out.push(parseInt(piece, 16))
    }
    return out
  }

  if (doubleColon === -1) {
    const all = toGroups(text.replace(/:$/, ''))
    if (!all) return null
    head = all
    rest = []
    const groups = [...head, ...tail]
    return groups.length === 8 ? groups : null
  }

  const left = toGroups(text.slice(0, doubleColon))
  const right = toGroups(text.slice(doubleColon + 2).replace(/:$/, ''))
  if (!left || !right) return null
  head = left
  rest = right
  const known = head.length + rest.length + tail.length
  if (known > 8) return null
  const zeros = new Array(8 - known).fill(0)
  return [...head, ...zeros, ...rest, ...tail]
}

/**
 * Non-public IPv6 space.
 *
 * The load-bearing case is the IPv4-mapped/compatible prefix: `::ffff:0:0/96`
 * and `::/96` embed a v4 address in the low 32 bits, so `::ffff:169.254.169.254`
 * would sail past a v6-only rule set and reach cloud metadata. Those are
 * UNWRAPPED and re-checked against the full IPv4 rules rather than pattern-
 * matched.
 */
function isBlockedIpv6(groups: number[]): boolean {
  const isZeroPrefix = groups.slice(0, 5).every((g) => g === 0)

  // ::ffff:a.b.c.d (mapped) and ::a.b.c.d (compatible, deprecated).
  if (isZeroPrefix && (groups[5] === 0xffff || groups[5] === 0)) {
    const embedded = [groups[6] >> 8, groups[6] & 0xff, groups[7] >> 8, groups[7] & 0xff]
    // `::` and `::1` fall out of the v4 rules as 0.0.0.0 and 0.0.0.1 (both 0/8).
    return isBlockedIpv4(embedded)
  }

  // 64:ff9b::/96 — NAT64, which can likewise encode an IPv4 destination.
  if (groups[0] === 0x0064 && groups[1] === 0xff9b && groups.slice(2, 6).every((g) => g === 0)) {
    const embedded = [groups[6] >> 8, groups[6] & 0xff, groups[7] >> 8, groups[7] & 0xff]
    return isBlockedIpv4(embedded)
  }

  const [first] = groups
  if ((first & 0xfe00) === 0xfc00) return true // fc00::/7 unique-local
  if ((first & 0xffc0) === 0xfe80) return true // fe80::/10 link-local
  if ((first & 0xff00) === 0xff00) return true // ff00::/8 multicast
  if (first === 0x2001 && groups[1] === 0x0db8) return true // 2001:db8::/32 doc
  if (first === 0x2002) return true // 2002::/16 6to4
  return false
}

/**
 * May the server open a connection to this resolved address?
 *
 * Unparseable input returns FALSE. An address we cannot reason about is not
 * one to connect to.
 */
export function isPublicIpAddress(address: string): boolean {
  const v4 = parseIpv4(address)
  if (v4) return !isBlockedIpv4(v4)
  const v6 = parseIpv6Groups(address)
  if (v6) return !isBlockedIpv6(v6)
  return false
}

/** Whether a hostname is an IP literal rather than a DNS name. */
export function isIpLiteral(hostname: string): boolean {
  const bare = hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname
  return parseIpv4(bare) !== null || parseIpv6Groups(bare) !== null
}

/**
 * Names that resolve somewhere local regardless of what DNS says, plus the
 * cloud metadata name. Belt and braces: the address check below would catch
 * these anyway, but failing early gives a clearer error and one less lookup.
 */
const BLOCKED_HOST_SUFFIXES = ['.local', '.localhost', '.internal', '.localdomain', '.home.arpa']
const BLOCKED_HOST_EXACT = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata',
  'instance-data',
])

export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  if (BLOCKED_HOST_EXACT.has(host)) return true
  return BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
}
