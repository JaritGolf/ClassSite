/**
 * Guarded server-side fetch of a teacher-supplied image URL (ADR 0023).
 *
 * A teacher pastes a picture link; we fetch it ONCE, here, and store the bytes
 * so students load it from our own domain. Two reasons, both required:
 *   - The CSP is `img-src 'self' data: blob:` and ImageSchema.asset only
 *     accepts `svg:<key>` or `/media/<path>`, so a remote URL cannot render.
 *   - Hotlinking would make every student's browser contact a third-party
 *     server, handing it their IP addresses and reading times.
 *
 * "The server fetches a URL the user supplied" is textbook SSRF, so every
 * guard below is load-bearing and re-applied ON EVERY REDIRECT HOP — a
 * first-hop-only check is the most common hole in exactly this kind of route.
 *
 * The address predicates live in ./ip-guard.ts and are unit-tested there.
 * Failures never echo the upstream body, headers or resolved IP: a verbose
 * error message turns this route into a port scanner.
 */

import { lookup as dnsLookup } from 'node:dns/promises'
import https from 'node:https'
import type { LookupAddress } from 'node:dns'
import { detectImageFormat, readImageDimensions, MIME_BY_FORMAT } from './format'
import type { DetectedImageFormat } from './format'
import { isBlockedHostname, isIpLiteral, isPublicIpAddress } from './ip-guard'

/** Same ceiling as the direct-upload route. */
export const MAX_REMOTE_IMAGE_BYTES = 4 * 1024 * 1024
const MAX_REDIRECTS = 3
/** Matches the YouTube oEmbed check's per-request budget. */
const FIRST_BYTE_TIMEOUT_MS = 5_000
/** A per-hop-only timeout lets 3 hops burn 15s; this bounds the whole import. */
const TOTAL_TIMEOUT_MS = 10_000
/** Below this, it isn't a picture — catches 1x1 trackers and empty bodies. */
const MIN_IMAGE_BYTES = 100

export type RemoteImageErrorCode =
  | 'INSECURE_SCHEME'
  | 'UNSUPPORTED_URL'
  | 'BLOCKED_ADDRESS'
  | 'HOST_UNREACHABLE'
  | 'TOO_MANY_REDIRECTS'
  | 'TIMED_OUT'
  | 'NOT_PUBLIC'
  | 'NOT_FOUND'
  | 'NOT_AN_IMAGE'
  | 'UNSUPPORTED_FORMAT'
  | 'FILE_TOO_LARGE'
  | 'FETCH_FAILED'

export class RemoteImageError extends Error {
  constructor(public readonly code: RemoteImageErrorCode) {
    super(code)
    this.name = 'RemoteImageError'
  }
}

export interface RemoteImage {
  data: Buffer
  mimeType: string
  format: DetectedImageFormat
  width: number | null
  height: number | null
  byteSize: number
  /** The host we ended up fetching from — shown to the teacher, and logged. */
  sourceHost: string
  finalUrl: string
  redirectCount: number
}

/**
 * Validate one URL and resolve it to a single address we are willing to open.
 * Runs on the original URL and again on every redirect target.
 */
async function validateHop(raw: string): Promise<{ url: URL; address: string; family: number }> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new RemoteImageError('UNSUPPORTED_URL')
  }

  if (url.protocol !== 'https:') {
    throw new RemoteImageError('INSECURE_SCHEME')
  }
  // Credentials in the URL are a redirect-laundering trick and never needed
  // for a public picture.
  if (url.username || url.password) {
    throw new RemoteImageError('UNSUPPORTED_URL')
  }
  // Port allowlist. On its own this kills wholesale internal port probing.
  if (url.port !== '' && url.port !== '443') {
    throw new RemoteImageError('UNSUPPORTED_URL')
  }
  // Force a real DNS name so the resolution check below always runs — an IP
  // literal would skip it entirely.
  if (isIpLiteral(url.hostname)) {
    throw new RemoteImageError('UNSUPPORTED_URL')
  }
  if (isBlockedHostname(url.hostname)) {
    throw new RemoteImageError('BLOCKED_ADDRESS')
  }

  let resolved: LookupAddress[]
  try {
    resolved = await dnsLookup(url.hostname, { all: true, verbatim: true })
  } catch {
    throw new RemoteImageError('HOST_UNREACHABLE')
  }
  if (resolved.length === 0) {
    throw new RemoteImageError('HOST_UNREACHABLE')
  }
  // EVERY address must be public, not merely the first. A name resolving to
  // one public and one private address is an attack, not a coincidence.
  for (const entry of resolved) {
    if (!isPublicIpAddress(entry.address)) {
      throw new RemoteImageError('BLOCKED_ADDRESS')
    }
  }

  return { url, address: resolved[0].address, family: resolved[0].family }
}

interface HopResult {
  status: number
  headers: Record<string, string | string[] | undefined>
  body: Buffer | null
  location: string | null
}

/**
 * Perform one GET, pinned to an address we already validated.
 *
 * Pinning closes the DNS-rebinding window: between validating the name and
 * opening the socket, a hostile resolver can flip its answer to 127.0.0.1.
 * Supplying our own `lookup` means the connection can only go where we
 * checked, while `servername` keeps TLS validating against the real hostname.
 *
 * node:https rather than undici: undici is a transitive dependency of Next,
 * not one of this project's six declared runtime deps, and reaching into it
 * would be a hidden dependency.
 */
function fetchHop(
  url: URL,
  address: string,
  family: number,
  deadline: number
): Promise<HopResult> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: 443,
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        servername: url.hostname,
        headers: {
          Host: url.host,
          Accept: 'image/png,image/jpeg,image/webp',
          'User-Agent': 'MyCivicsClass-LessonImageImport/1.0',
          'Accept-Encoding': 'identity',
        },
        lookup: (_hostname, _options, callback) => {
          // Ignore whatever DNS would say now; use the vetted address.
          ;(callback as (err: null, address: string, family: number) => void)(
            null,
            address,
            family
          )
        },
      },
      (res) => {
        const status = res.statusCode ?? 0
        const location = (res.headers.location as string | undefined) ?? null

        if (status >= 300 && status < 400 && location) {
          res.resume() // discard the body
          resolve({ status, headers: res.headers, body: null, location })
          return
        }

        // Declared size: refuse before reading a byte when it is already over.
        const declared = Number(res.headers['content-length'])
        if (Number.isFinite(declared) && declared > MAX_REMOTE_IMAGE_BYTES) {
          req.destroy()
          reject(new RemoteImageError('FILE_TOO_LARGE'))
          return
        }

        const chunks: Buffer[] = []
        let total = 0
        res.on('data', (chunk: Buffer) => {
          total += chunk.length
          // The REAL cap. Content-Length is a claim, not a fact — destroy the
          // socket the instant the running total exceeds the limit rather than
          // buffering an unbounded body.
          if (total > MAX_REMOTE_IMAGE_BYTES) {
            req.destroy()
            reject(new RemoteImageError('FILE_TOO_LARGE'))
            return
          }
          chunks.push(chunk)
        })
        res.on('end', () => {
          resolve({ status, headers: res.headers, body: Buffer.concat(chunks), location: null })
        })
        res.on('error', () => reject(new RemoteImageError('FETCH_FAILED')))
      }
    )

    req.setTimeout(Math.max(1, Math.min(FIRST_BYTE_TIMEOUT_MS, deadline - Date.now())), () => {
      req.destroy()
      reject(new RemoteImageError('TIMED_OUT'))
    })
    req.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
        reject(new RemoteImageError('HOST_UNREACHABLE'))
        return
      }
      reject(new RemoteImageError('FETCH_FAILED'))
    })
    req.end()
  })
}

/**
 * Fetch and validate a remote image, following at most 3 redirects and
 * re-running every guard on each one.
 */
export async function fetchRemoteImage(rawUrl: string): Promise<RemoteImage> {
  const deadline = Date.now() + TOTAL_TIMEOUT_MS
  let current = rawUrl
  let redirectCount = 0

  for (;;) {
    if (Date.now() >= deadline) throw new RemoteImageError('TIMED_OUT')

    const { url, address, family } = await validateHop(current)
    const hop = await fetchHop(url, address, family, deadline)

    if (hop.location) {
      if (redirectCount >= MAX_REDIRECTS) throw new RemoteImageError('TOO_MANY_REDIRECTS')
      redirectCount += 1
      // Resolve relative Locations against the current URL, then loop so the
      // FULL guard set runs again on the new target.
      current = new URL(hop.location, url).toString()
      continue
    }

    if (hop.status === 401 || hop.status === 403) throw new RemoteImageError('NOT_PUBLIC')
    if (hop.status === 404 || hop.status === 410) throw new RemoteImageError('NOT_FOUND')
    if (hop.status !== 200) throw new RemoteImageError('FETCH_FAILED')

    const body = hop.body
    if (!body) throw new RemoteImageError('FETCH_FAILED')

    // Content-Type is advisory only — used for a fast, accurate error when the
    // link obviously points at a page rather than a picture.
    const contentType = String(hop.headers['content-type'] ?? '').toLowerCase()
    if (contentType.startsWith('text/') || contentType.includes('html')) {
      throw new RemoteImageError('NOT_AN_IMAGE')
    }
    if (body.byteLength < MIN_IMAGE_BYTES) throw new RemoteImageError('NOT_AN_IMAGE')

    // Magic bytes are AUTHORITATIVE. Same rule the direct-upload route uses.
    const format = detectImageFormat(body)
    if (!format) throw new RemoteImageError('UNSUPPORTED_FORMAT')
    const dimensions = readImageDimensions(body, format)

    return {
      data: body,
      // Our own metadata, never the server's claim.
      mimeType: MIME_BY_FORMAT[format],
      format,
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
      byteSize: body.byteLength,
      sourceHost: url.hostname,
      finalUrl: url.toString(),
      redirectCount,
    }
  }
}
